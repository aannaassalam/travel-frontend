import { usePrefs } from "@/lib/prefs";
import { rideCentre } from "@/lib/transfers";
import { cn } from "@/lib/utils";
import type { TransferPoint } from "@/typescript/interface/domain.interface";
import { MapPin, MapPinOff } from "lucide-react";
import dynamic from "next/dynamic";
import type { RideEnd, TransferCanvasProps } from "./TransferMapCanvas";

/**
 * The map of a ride: both pins and the road between them.
 *
 * Leaflet loads only in the browser and only once this mounts, behind the same
 * drawn placeholder as the listing map, so the page never waits for it. If the
 * chunk fails to arrive — a connection dropping mid-download is routine on 3G —
 * the box says so and the booking carries on from the places list: the map
 * helps, it is never required.
 */

export function Placeholder() {
  return (
    <div className="relative h-full bg-brand-100">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#1e5a8e_1px,transparent_1px),linear-gradient(90deg,#1e5a8e_1px,transparent_1px)] [background-size:32px_32px]" />
      <MapPin className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-brand-900" />
    </div>
  );
}

export function Unavailable() {
  const { t } = usePrefs();
  return (
    <div className="flex h-full items-center justify-center gap-3 bg-ink-50 p-6 text-center text-sm text-ink-700">
      <MapPinOff className="size-5 shrink-0 text-ink-500" aria-hidden="true" />
      {t("transfer.mapUnavailable")}
    </div>
  );
}

const Canvas = dynamic<TransferCanvasProps>(
  () => import("./TransferMapCanvas").catch(() => ({ default: Unavailable })),
  { ssr: false, loading: () => <Placeholder /> }
);

export default function TransferMap({
  pickup,
  dropoff,
  route,
  estimated,
  city,
  around,
  onMove,
  onTap,
  className
}: {
  pickup?: TransferPoint;
  dropoff?: TransferPoint;
  route?: [number, number][];
  estimated?: boolean;
  /** Centres the empty map on this city; Kinshasa when it is not one we know. */
  city?: string;
  /** Where to centre the empty map instead, when the page knows better (a city's saved place). */
  around?: { lat: number; lng: number };
  /** The pins can be dragged to correct a point. */
  onMove?: (end: RideEnd, p: { lat: number; lng: number }) => void;
  /** A tap on the map itself (the booking page opens the picker). */
  onTap?: () => void;
  className?: string;
}) {
  const { t } = usePrefs();
  const centre = pickup ?? dropoff ?? around ?? rideCentre(city);
  return (
    /* `isolate`: Leaflet's panes carry z-indexes up to 1000, which would sail
       over the sticky header; a stacking context keeps them in this box. */
    <div className={cn("relative isolate z-0 overflow-hidden rounded-xl bg-brand-100", className ?? "h-64")}>
      <Canvas
        centre={centre}
        pickup={pickup}
        dropoff={dropoff}
        route={route}
        estimated={estimated}
        onMove={onMove}
        onTap={onTap}
        labels={{ zoomIn: t("transfer.zoomIn"), zoomOut: t("transfer.zoomOut") }}
      />
    </div>
  );
}
