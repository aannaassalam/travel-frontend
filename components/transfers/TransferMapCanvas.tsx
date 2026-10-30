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
  ZoomControl,
  useMap,
  useMapEvents
} from "react-leaflet";

/**
 * The Leaflet side of the ride maps: the ride map (both pins and the road
 * between them; on the booking page the pins can be dragged) and the map
 * picker's canvas. Split out so the parents can `dynamic(..., { ssr: false })`
 * it: Leaflet reads `window` at import, so this module must never reach the
 * server bundle.
 *
 * Kept apart from catalog/LeafletCanvas on purpose: that one draws one pin for
 * a hotel; growing it a route and a picker would make every listing page carry
 * code it never runs.
 */

type LatLng = { lat: number; lng: number };
export type RideEnd = "pickup" | "dropoff";
/** The zoom buttons' names, in the visitor's language (Leaflet's own are English). */
export type ZoomLabels = { zoomIn: string; zoomOut: string };

export interface TransferCanvasProps {
  /** Where to look before any point exists: the city centre. */
  centre: LatLng;
  pickup?: TransferPoint;
  dropoff?: TransferPoint;
  /** GeoJSON order, [lng, lat], as the API sends it. */
  route?: [number, number][];
  /** The straight line the server falls back to: drawn dashed, so it is not read as a road. */
  estimated?: boolean;
  /** Pins can be dragged (with a mouse), and say where they were dropped. */
  onMove?: (end: RideEnd, p: LatLng) => void;
  /** A tap on the map itself, not on a pin. */
  onTap?: () => void;
  labels?: ZoomLabels;
}

/**
 * Same inline-SVG pin as the listing map (Leaflet's PNG 404s under a bundler),
 * lettered so the two ends read as A and B at a glance. Navy for the pick-up,
 * the cars' tint for the drop-off — amber stays the CTA colour and nothing else.
 * MapPicker draws the same pin over its map centre.
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

function Tiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      // No {s} sub-domain: the CSP (next.config.ts TILE_ORIGINS) names this host only.
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  );
}

function Zoom({ labels }: { labels?: ZoomLabels }) {
  return <ZoomControl position="topleft" zoomInTitle={labels?.zoomIn} zoomOutTitle={labels?.zoomOut} />;
}

/** Keeps every point and the whole route in view whenever they change. */
function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  // A string, so the effect reruns on a new set of points and not on every render.
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (!points.length) return;
    // Zoomed in already and everything still in view (a pin nudged a little,
    // its new road): the zoom the customer chose to place it stays. From the
    // city-wide view, a first point is still zoomed to.
    if (map.getZoom() >= 14 && map.getBounds().pad(-0.05).contains(L.latLngBounds(points))) return;
    // Not animated: Leaflet ignores a new zoom while one is under way, so a
    // second point (or its road) landing during the first point's zoom was
    // never fitted, and the new pin stayed off the map.
    if (points.length === 1) map.setView(points[0], 15, { animate: false });
    // A pin stands 38px above its point and the zoom buttons hold the top-left
    // corner: with even padding, a point there hid under them on a phone.
    else
      map.fitBounds(L.latLngBounds(points), {
        paddingTopLeft: [64, 44],
        paddingBottomRight: [36, 36],
        maxZoom: 16,
        animate: false
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/**
 * The map is made once, on the centre it first gets: a city picked (or read
 * from the address) after that is looked at here, while no point is set.
 */
function Recentre({ centre, idle }: { centre: LatLng; idle: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (idle) map.setView([centre.lat, centre.lng], 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, centre.lat, centre.lng]);
  return null;
}

function Tap({ onTap }: { onTap: () => void }) {
  useMapEvents({ click: () => onTap() });
  return null;
}

/**
 * Pins drag with a mouse only: on a touch screen a swipe that starts on a pin
 * is someone scrolling the page, and it would move a booked point unseen. The
 * picker is how a phone corrects a point.
 */
const canDrag = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

function End({
  end,
  point,
  onMove
}: {
  end: RideEnd;
  point: TransferPoint;
  onMove?: TransferCanvasProps["onMove"];
}) {
  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={end === "pickup" ? PICKUP : DROPOFF}
      title={point.label}
      draggable={Boolean(onMove) && canDrag()}
      eventHandlers={
        onMove
          ? {
              dragend: (e) => {
                const p = (e.target as L.Marker).getLatLng();
                onMove(end, { lat: p.lat, lng: p.lng });
              }
            }
          : undefined
      }
    >
      <Popup>{point.label}</Popup>
    </Marker>
  );
}

export default function TransferMapCanvas({
  centre,
  pickup,
  dropoff,
  route,
  estimated,
  onMove,
  onTap,
  labels
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
      zoomControl={false}
      className="h-full w-full"
      attributionControl
    >
      <Tiles />
      <Zoom labels={labels} />
      {line.length > 1 && (
        <Polyline
          positions={line}
          pathOptions={{ color: "#1e5a8e", weight: 5, opacity: 0.85, dashArray: estimated ? "8 10" : undefined }}
        />
      )}
      {/* Keyed on the label: Leaflet sets a marker's title once, and a name
          that lands later (or a swap) must reach the tooltip and screen readers. */}
      {pickup && <End key={`a-${pickup.label}`} end="pickup" point={pickup} onMove={onMove} />}
      {dropoff && <End key={`b-${dropoff.label}`} end="dropoff" point={dropoff} onMove={onMove} />}
      {/* The pins too: the road starts where the router snapped, not at the pin. */}
      <Fit points={[...line, ...points]} />
      <Recentre centre={centre} idle={!points.length && line.length < 2} />
      {onTap && <Tap onTap={onTap} />}
    </MapContainer>
  );
}

/* ------------------------------------------------------------ the picker */

export interface PickerCanvasProps {
  start: LatLng & { zoom: number };
  /** The ride's other end, shown for bearings; it does not move. */
  other?: { end: RideEnd; point: TransferPoint };
  /** Move the view here (the device's position); a new object each time. */
  goTo?: LatLng & { zoom: number };
  /** The map, once made: confirming reads the live centre from it, mid-glide too. */
  mapRef?: { current: L.Map | null };
  /** The map is drawn and can be used. */
  onReady?: () => void;
  /** The map has started moving: the name on screen is no longer the pin's. */
  onMoving?: () => void;
  /** The customer is dragging the map: they have taken over from "Use my location". */
  onDrag?: () => void;
  /** The map centre — where the fixed pin points — each time the map comes to rest. */
  onCentre: (p: LatLng) => void;
  labels?: ZoomLabels;
}

function Centre({ goTo, mapRef, onReady, onMoving, onDrag, onCentre }: Omit<PickerCanvasProps, "start" | "other" | "labels">) {
  const map = useMapEvents({
    movestart: () => onMoving?.(),
    dragstart: () => onDrag?.(),
    moveend: () => {
      const c = map.getCenter();
      onCentre({ lat: c.lat, lng: c.lng });
    }
  });
  useEffect(() => {
    if (mapRef) mapRef.current = map;
    onReady?.();
    return () => {
      if (mapRef) mapRef.current = null;
    };
    // Once per map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  useEffect(() => {
    if (goTo) map.setView([goTo.lat, goTo.lng], goTo.zoom);
  }, [map, goTo]);
  // Leaflet measures its box at mount and on window resizes only: MapPicker
  // keeps the panel under the map at one height so the box never changes.
  return null;
}

export function PickerCanvas({
  start,
  other,
  goTo,
  mapRef,
  onReady,
  onMoving,
  onDrag,
  onCentre,
  labels
}: PickerCanvasProps) {
  return (
    <MapContainer
      center={[start.lat, start.lng]}
      zoom={start.zoom}
      zoomControl={false}
      className="h-full w-full"
      attributionControl
    >
      <Tiles />
      <Zoom labels={labels} />
      {other && (
        <Marker
          position={[other.point.lat, other.point.lng]}
          icon={other.end === "pickup" ? PICKUP : DROPOFF}
          interactive={false}
          keyboard={false}
        />
      )}
      <Centre
        goTo={goTo}
        mapRef={mapRef}
        onReady={onReady}
        onMoving={onMoving}
        onDrag={onDrag}
        onCentre={onCentre}
      />
    </MapContainer>
  );
}
