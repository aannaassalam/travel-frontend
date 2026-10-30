import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePrefs } from "@/lib/prefs";
import {
  inDrc,
  locateForPicker,
  placeText,
  pointNameQuery,
  round5,
  zoomForAccuracy
} from "@/lib/transfers";
import { useDebounced } from "@/lib/useDebounced";
import { cn } from "@/lib/utils";
import type { TransferPoint } from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import type { Map as LeafletMap } from "leaflet";
import { Loader2, LocateFixed, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { Placeholder, Unavailable } from "./TransferMap";
import type { PickerCanvasProps, RideEnd } from "./TransferMapCanvas";

/**
 * A point picked on a full-screen map, the way ride apps do it: the pin stays
 * in the middle and the customer moves the map under it, then confirms. The
 * name of the spot shows as soon as the map comes to rest. A full screen on a
 * phone, a large box on a computer.
 *
 * Mount it only while it is open: the map starts where the caller says, and a
 * fresh mount is what resets it.
 */

type LatLng = { lat: number; lng: number };

const PickerCanvas = dynamic<PickerCanvasProps>(
  () => import("./TransferMapCanvas").then((m) => m.PickerCanvas).catch(() => Unavailable),
  { ssr: false, loading: () => <Placeholder /> }
);

/** Within this (about 2 m), a centre the map reports is the one already held: a re-measure, not a move. */
const SAME_SPOT = 2e-5;
const near = (a: LatLng, b: LatLng, d: number) => Math.abs(a.lat - b.lat) < d && Math.abs(a.lng - b.lng) < d;

/** Same pin as the ride map's (TransferMapCanvas), drawn here so this module stays Leaflet-free. */
function CentrePin({ end }: { end: RideEnd }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="47"
      viewBox="0 0 24 28"
      aria-hidden="true"
      // The tip, not the middle of the drawing, marks the map centre.
      className="pointer-events-none absolute left-1/2 top-1/2 z-1000 -translate-x-1/2 -translate-y-[95%] drop-shadow-md"
    >
      <path
        d="M12 27s9-8 9-15a9 9 0 1 0-18 0c0 7 9 15 9 15Z"
        fill={end === "pickup" ? "#0a2540" : "#b5622e"}
        stroke="#fff"
        strokeWidth="1.5"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill="#fff"
      >
        {end === "pickup" ? "A" : "B"}
      </text>
    </svg>
  );
}

export default function MapPicker({
  end,
  start,
  other,
  locateFirst,
  onConfirm,
  onClose
}: {
  end: RideEnd;
  /** Where the map opens: the point being changed, else the other end, else the city. */
  start: LatLng & { zoom: number };
  other?: TransferPoint;
  /** Opened from "Use my location": the device is asked first. */
  locateFirst?: boolean;
  /** The centre, rounded, and its name when one came back in time. */
  onConfirm: (p: LatLng, name?: string) => void;
  onClose: () => void;
}) {
  const { t, locale } = usePrefs();
  const hintId = useId();
  const map = useRef<LeafletMap | null>(null);
  // Radix hands focus back to a DialogTrigger, and this dialog has none: it
  // goes back to what opened it. From a place field (its map button, its input,
  // its "Use my location" row) that is the field's map button — the input would
  // open its list again, and the row is gone. Read now, while the row still is.
  const [opener] = useState(() => {
    if (typeof document === "undefined") return null;
    const active = document.activeElement as HTMLElement | null;
    return (
      active?.closest("[data-place-field]")?.querySelector<HTMLElement>("[data-pick-on-map]") ?? active
    );
  });
  const [ready, setReady] = useState(false);
  const [centre, setCentre] = useState<LatLng>(start);
  const [moving, setMoving] = useState(false);
  const [goTo, setGoTo] = useState<LatLng & { zoom: number }>();
  // From "Use my location", the opening view is only on the way to the device's position: not named.
  const [locating, setLocating] = useState(Boolean(locateFirst));
  // The customer dragged the map while the device was being asked: they have
  // taken over, and the answer must not pull the map away from where they went.
  const [byHand, setByHand] = useState(false);
  const byHandNow = useRef(false);
  const [error, setError] = useState("");

  // Named once the map has rested a moment, not at every frame of a pan.
  const still = useDebounced(centre, 400);
  const settled = !moving && still === centre;
  const inside = inDrc(centre);
  // On the ride's other point already (the drop-off picker opens there): not a ride.
  const onOther = Boolean(other && near(centre, other, 3e-4));
  // Asked only for a spot the map rests on: not the one it is leaving.
  const name = useQuery({ ...pointNameQuery(still), enabled: settled && inDrc(still) && !locating, retry: 0 });
  const named = settled && name.data && !name.isFetching ? placeText(name.data.name, locale) : undefined;

  /**
   * What is under the pin now — read from the map, not the last resting
   * centre: a tap on Confirm right after a swipe lands while the map still
   * glides, and stopping the glide there is what the customer saw.
   */
  const confirm = () => {
    map.current?.stop();
    const c = map.current?.getCenter() ?? centre;
    const p = { lat: round5(c.lat), lng: round5(c.lng) };
    if (!inDrc(p)) return setError(t("transfer.err.outsideDrc"));
    // The name only if it is this very spot's; otherwise the form looks it up.
    const here = round5(still.lat) === p.lat && round5(still.lng) === p.lng;
    onConfirm(p, here ? named : undefined);
  };

  const findMe = async () => {
    setLocating(true);
    setError("");
    setByHand(false);
    byHandNow.current = false;
    const fix = await locateForPicker();
    setLocating(false);
    if (fix === "denied") return setError(t("transfer.locateDenied"));
    if (fix === "failed") return setError(t("transfer.locateFailed"));
    if (!inDrc(fix)) return setError(t("transfer.outsideDrcPhone"));
    if (byHandNow.current) return;
    // The centre is the device's from now: nothing is named for the view the map is leaving.
    setCentre({ lat: fix.lat, lng: fix.lng });
    setGoTo({ lat: fix.lat, lng: fix.lng, zoom: zoomForAccuracy(fix.accuracy) });
  };

  useEffect(() => {
    if (locateFirst) void findMe();
    // Once, on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While the device is asked, the view is only on its way: no spot is named yet.
  const what = locating
    ? `${t("transfer.locating")}…`
    : !inside
    ? t("transfer.err.outsideDrc")
    : onOther
      ? t("transfer.samePlace")
      : (named ?? (settled && !name.isFetching ? t("transfer.mapPoint") : `${t("transfer.findingName")}…`));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={hintId}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (opener?.isConnected) opener.focus();
        }}
        className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 sm:top-1/2 sm:left-1/2 sm:h-[min(85vh,760px)] sm:w-[min(92vw,920px)] sm:max-w-none sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-2">
          <DialogTitle className="min-w-0 flex-1 truncate text-base font-bold text-brand-900">
            {t(end === "pickup" ? "transfer.pickup" : "transfer.dropoff")}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-700 hover:bg-ink-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* `isolate`: Leaflet's panes stay under the pin and the button. */}
        <div
          role="region"
          aria-label={t("transfer.map")}
          className="relative isolate z-0 min-h-0 flex-1 bg-brand-100"
        >
          <PickerCanvas
            start={start}
            other={other ? { end: end === "pickup" ? "dropoff" : "pickup", point: other } : undefined}
            goTo={goTo}
            mapRef={map}
            labels={{ zoomIn: t("transfer.zoomIn"), zoomOut: t("transfer.zoomOut") }}
            onReady={() => setReady(true)}
            onMoving={() => setMoving(true)}
            onDrag={() => {
              byHandNow.current = true;
              setByHand(true);
              setError("");
            }}
            onCentre={(c) => {
              setMoving(false);
              setCentre((was) => (near(was, c, SAME_SPOT) ? was : c));
            }}
          />
          <CentrePin end={end} />
          {error && (
            <p
              role="alert"
              className="absolute inset-x-3 top-3 z-1000 rounded-xl bg-white px-3 py-2 text-sm font-medium text-bad-600 shadow-md"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void findMe()}
            disabled={locating || !ready}
            aria-busy={locating}
            // Clear of the map's credit line, which must stay readable.
            className="absolute right-3 bottom-8 z-1000 flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-brand-700 shadow-md ring-1 ring-ink-100 ring-inset hover:bg-brand-50 disabled:opacity-70"
          >
            {locating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="size-4" aria-hidden="true" />
            )}
            {locating ? `${t("transfer.locating")}…` : t("transfer.myLocation")}
          </button>
        </div>

        <div className="space-y-3 border-t border-ink-100 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p id={hintId} className="text-xs text-ink-500">
            {t("transfer.pickerHint")}
          </p>
          {/* A constant height, two lines kept for the name and a line for its
              credit: Leaflet measures the map box once, so a panel that grew or
              shrank would move the box's middle away from the pin. */}
          <div aria-live="polite">
            <p
              className={cn(
                "line-clamp-2 min-h-12 font-semibold",
                inside && !onOther ? "text-ink-900" : "text-bad-600"
              )}
            >
              {what}
            </p>
            {/* The names come from MapTiler, on OpenStreetMap data: credited where they show. */}
            <p className={cn("mt-0.5 text-[11px] text-ink-500", !(named && name.data?.external) && "invisible")}>
              {t("transfer.namesCredit")}
            </p>
          </div>
          <button
            type="button"
            // Not before the map is there, nor while the device is still being
            // asked (the view is not its position yet) unless the customer has
            // taken over by moving the map.
            disabled={!ready || !inside || onOther || (locating && !byHand)}
            onClick={confirm}
            className="btn btn-lg btn-primary w-full"
          >
            {t(end === "pickup" ? "transfer.confirmPickup" : "transfer.confirmDropoff")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
