import type { TransferPoint } from "@/typescript/interface/domain.interface";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents
} from "react-leaflet";

/**
 * The Leaflet side of a ride map: pick-up and drop-off pins, the road between
 * them, and — on the booking page — a click that places a pin. Split out so the
 * parent can `dynamic(..., { ssr: false })` it: Leaflet reads `window` at
 * import, so this module must never reach the server bundle.
 *
 * Kept apart from catalog/LeafletCanvas on purpose: that one draws one pin for
 * a hotel; growing it a route and a click handler would make every listing
 * page carry code it never runs.
 */

export interface TransferCanvasProps {
  /** Where to look before any point exists: the city centre. */
  centre: { lat: number; lng: number };
  pickup?: TransferPoint;
  dropoff?: TransferPoint;
  /** GeoJSON order, [lng, lat], as the API sends it. */
  route?: [number, number][];
  /** A tap places a point: crosshair cursor, and `onPick` gets it. */
  picking?: boolean;
  onPick?: (p: { lat: number; lng: number }) => void;
}

/**
 * Same inline-SVG pin as the listing map (Leaflet's PNG 404s under a bundler),
 * lettered so the two ends read as A and B at a glance. Navy for the pick-up,
 * the cars' tint for the drop-off — amber stays the CTA colour and nothing else.
 */
const pin = (fill: string, letter: string) =>
  L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="40" viewBox="0 0 24 28"
             style="filter: drop-shadow(0 2px 4px rgb(20 22 26 / 0.35))">
             <path d="M12 27s9-8 9-15a9 9 0 1 0-18 0c0 7 9 15 9 15Z" fill="${fill}" stroke="#fff" stroke-width="1.5"/>
             <text x="12" y="16" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#fff">${letter}</text>
           </svg>`,
    iconSize: [34, 40],
    iconAnchor: [17, 38],
    popupAnchor: [0, -34]
  });

const PICKUP = pin("#0a2540", "A");
const DROPOFF = pin("#b5622e", "B");

/** Keeps every point and the whole route in view whenever they change. */
function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  // A string, so the effect reruns on a new set of points and not on every render.
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 15);
    // A pin stands 38px above its point and the zoom buttons hold the top-left
    // corner: with even padding, a point there hid under them on a phone.
    else
      map.fitBounds(L.latLngBounds(points), {
        paddingTopLeft: [64, 44],
        paddingBottomRight: [36, 36],
        maxZoom: 16
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function Picker({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function TransferMapCanvas({
  centre,
  pickup,
  dropoff,
  route,
  picking,
  onPick
}: TransferCanvasProps) {
  const line = (route ?? []).map(([lng, lat]) => [lat, lng] as [number, number]);
  const points = [pickup, dropoff]
    .filter((p): p is TransferPoint => Boolean(p))
    .map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <MapContainer
      center={[centre.lat, centre.lng]}
      zoom={points.length ? 14 : 12}
      // Off, as on the listing map: the page scrolls past this box.
      scrollWheelZoom={false}
      className="h-full w-full"
      // Inline, because Leaflet's own stylesheet sets the grab cursor on the
      // container and a utility class would lose that fight.
      style={picking ? { cursor: "crosshair" } : undefined}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        // No {s} sub-domain: the CSP (next.config.ts TILE_ORIGINS) names this host only.
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {line.length > 1 && (
        <Polyline positions={line} pathOptions={{ color: "#1e5a8e", weight: 5, opacity: 0.85 }} />
      )}
      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={PICKUP} title={pickup.label}>
          <Popup>{pickup.label}</Popup>
        </Marker>
      )}
      {dropoff && (
        <Marker position={[dropoff.lat, dropoff.lng]} icon={DROPOFF} title={dropoff.label}>
          <Popup>{dropoff.label}</Popup>
        </Marker>
      )}
      {/* The pins too: the road starts where the router snapped, not at the pin. */}
      <Fit points={[...line, ...points]} />
      {onPick && <Picker onPick={onPick} />}
    </MapContainer>
  );
}
