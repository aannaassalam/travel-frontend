import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { KIND_LOOK, MAP_KINDS, type MapKind, type MapPlace, placeHref } from "@/lib/townMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { type ReactElement, useEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";

/**
 * The Leaflet side of the town map, split out so the page can load it with
 * `dynamic(..., { ssr: false })`: Leaflet reads `window` at import. Tiles and
 * the "no {s} sub-domain" rule as on the listing and transfer maps (the CSP
 * names tile.openstreetmap.org itself).
 */

type LatLng = { lat: number; lng: number };

/**
 * An icon as markup for Leaflet, drawn with the React already on the page:
 * react-dom/server would add about 100 KB to this chunk for four icons.
 */
function markupOf(node: ReactElement) {
  const box = document.createElement("span");
  const root = createRoot(box);
  flushSync(() => root.render(node));
  const html = box.innerHTML;
  root.unmount();
  return html;
}

/** A round pin in the service's colour with its icon, as the header's tabs show it. */
const PINS = Object.fromEntries(
  MAP_KINDS.map((kind) => {
    const { Icon, tint } = KIND_LOOK[kind];
    return [
      kind,
      L.divIcon({
        className: "",
        html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:${tint};color:#fff;border:2px solid #fff;box-shadow:0 2px 6px rgb(20 22 26 / 0.35)">${markupOf(
          <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
        )}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
      })
    ];
  })
) as Record<MapKind, L.DivIcon>;

/** Every pin in view whenever the set changes; the town centre when there is none. */
function Fit({ points, centre }: { points: [number, number][]; centre: LatLng }) {
  const map = useMap();
  // A string, so the effect reruns on a new set of points and not on every render.
  const key = `${points.map((p) => p.join(",")).join(";")}|${centre.lat},${centre.lng}`;
  useEffect(() => {
    if (points.length > 1)
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16, animate: false });
    else if (points.length === 1) map.setView(points[0], 15, { animate: false });
    else map.setView([centre.lat, centre.lng], 12, { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function PlacePopup({ place, town }: { place: MapPlace; town: string }) {
  const { t, lz } = usePrefs();
  const { Icon, tint } = KIND_LOOK[place.kind];
  return (
    // Divs, not <p>: leaflet.css gives a popup's paragraphs 1.3em margins.
    <div className="w-50 text-start">
      {place.image && (
        // Plain <img>: images are served as they are (next.config images.unoptimized).
        <img
          src={mediaUrl(place.image)}
          alt=""
          loading="lazy"
          className="mb-2.5 h-24 w-full rounded-lg object-cover"
        />
      )}
      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: tint }}>
        <Icon className="size-3.5" aria-hidden="true" />
        {t(`map.kind.${place.kind}`)}
      </div>
      <div className="mt-1 text-sm leading-snug font-bold text-brand-900">{lz(place.name)}</div>
      {place.subtitle && <div className="mt-0.5 text-xs text-ink-500">{place.subtitle}</div>}
      {place.kind === "PARKING" && (
        <div className="mt-1 text-xs font-medium text-ink-700">
          {t("map.vehicles", { n: place.vehicleCount ?? 0 })}
        </div>
      )}
      <Link href={placeHref(place, town)} className="btn btn-sm btn-dark mt-3 w-full text-white!">
        {t("map.open")}
      </Link>
    </div>
  );
}

export interface TownMapCanvasProps {
  places: MapPlace[];
  /** The town's name, for the parking links. */
  town: string;
  /** Where to look when there is no pin. */
  centre: LatLng;
}

export default function TownMapCanvas({ places, town, centre }: TownMapCanvasProps) {
  const { t, lz } = usePrefs();
  const points = places.map((p) => [p.lat, p.lng] as [number, number]);
  return (
    <MapContainer
      center={[centre.lat, centre.lng]}
      zoom={12}
      // Off, as on the other maps: the page scrolls past this box.
      scrollWheelZoom={false}
      zoomControl={false}
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomControl position="topleft" zoomInTitle={t("transfer.zoomIn")} zoomOutTitle={t("transfer.zoomOut")} />
      {places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={PINS[p.kind]} title={lz(p.name)}>
          <Popup>
            <PlacePopup place={p} town={town} />
          </Popup>
        </Marker>
      ))}
      <Fit points={points} centre={centre} />
    </MapContainer>
  );
}
