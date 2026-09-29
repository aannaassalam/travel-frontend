import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LayersControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer
} from "react-leaflet";

/**
 * The Leaflet map itself, split out so it can be `dynamic(..., { ssr: false })`.
 *
 * Nothing in here runs on the server: Leaflet reads `window` at import time, so
 * even importing this module server-side throws. Keeping the import boundary at
 * this file is what lets the parent render a placeholder without pulling
 * Leaflet into the server bundle.
 */

/* ------------------------------------------------------------------- tiles */

/**
 * MapTiler's OpenMapTiles raster layers.
 *
 * The key is `NEXT_PUBLIC_` and therefore visible in the browser. That is
 * normal and unavoidable for tile services — the browser is what fetches the
 * tiles — but it means the key MUST be domain-restricted in the MapTiler
 * dashboard, or anyone can lift it and spend your quota.
 *
 * Style names come from MapTiler's own catalogue. They cannot be validated
 * without a key (the API checks the key before the style, so even a nonsense
 * name answers 403), so if one ever renders blank, check it against
 * https://docs.maptiler.com/ rather than assuming the map is broken.
 */
const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/">&copy; MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface BaseLayerDef {
  /** Shown in the layers control. */
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

/**
 * The base layers offered in the control.
 *
 * Deliberately all from one provider, so switching between them changes the
 * cartography and not the quality — mixing a crisp vector-rendered style with a
 * heavier third-party raster makes the map feel broken rather than versatile.
 *
 * Streets first because it is the one that answers "which neighbourhood is
 * this"; satellite is what people reach for to see the actual building.
 */
const maptiler = (style: string, ext: "png" | "jpg" = "png"): string =>
  `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.${ext}?key=${KEY}`;

const BASE_LAYERS: BaseLayerDef[] = KEY
  ? [
      {
        name: "Streets",
        url: maptiler("streets-v2"),
        attribution: MAPTILER_ATTRIBUTION,
        maxZoom: 20
      },
      {
        // Satellite imagery with road and place labels on top — the one that
        // answers "what does it actually look like".
        name: "Satellite",
        url: maptiler("hybrid", "jpg"),
        attribution: MAPTILER_ATTRIBUTION,
        maxZoom: 20
      },
      {
        name: "Terrain",
        url: maptiler("topo-v2"),
        attribution: MAPTILER_ATTRIBUTION,
        maxZoom: 20
      }
    ]
  : [
      /**
       * No key: one plain OSM layer. A control offering a single choice is
       * noise, so it is not rendered at all in this case — see below.
       */
      {
        name: "Streets",
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19
      }
    ];

/* -------------------------------------------------------------------- pin */

/**
 * Leaflet's default marker is a PNG it resolves against the page URL, which
 * 404s under a bundler and leaves a broken image where the pin should be. This
 * is the standard fix, done as an inline SVG so the icon is part of our bundle
 * rather than another asset request — and drawn in the brand navy instead of
 * Leaflet's blue.
 */
const pin = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
           fill="#0a2540" stroke="#ffffff" stroke-width="1.5"
           style="filter: drop-shadow(0 2px 4px rgb(20 22 26 / 0.35))">
           <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/>
           <circle cx="12" cy="10" r="2.5" fill="#ffffff" stroke="none"/>
         </svg>`,
  iconSize: [32, 32],
  // Anchor at the point of the pin, not its centre, or the marker sits low.
  iconAnchor: [16, 30],
  popupAnchor: [0, -28]
});

export default function LeafletCanvas({
  geo,
  label,
  zoom = 14,
  showMarker = true
}: {
  geo: { lat: number; lng: number };
  label: string;
  /** 14 for an exact address, wider for a city-centre fallback. */
  zoom?: number;
  /**
   * Off for an approximate view. A pin asserts "it is here", so dropping one on
   * a city centre would invent a precision we do not have.
   */
  showMarker?: boolean;
}) {
  const position: [number, number] = [geo.lat, geo.lng];
  // One option is not a choice; the control only earns its space with several.
  const showControl = BASE_LAYERS.length > 1;

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      // Scroll-wheel zoom off: the map sits inside a scrolling page, and
      // hijacking the wheel traps anyone trying to scroll past it. Drag,
      // double-click and the +/- control all still zoom.
      scrollWheelZoom={false}
      className="h-full w-full"
      attributionControl
    >
      {showControl ? (
        <LayersControl position="topright">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* {BASE_LAYERS.map((layer, i) => (
            <LayersControl.BaseLayer
              key={layer.name}
              name={layer.name}
              // Exactly one must start checked or the map opens blank.
              checked={i === 0}
            >
              <TileLayer
                url={layer.url}
                attribution={layer.attribution}
                maxZoom={layer.maxZoom}
              />
            </LayersControl.BaseLayer>
          ))} */}
        </LayersControl>
      ) : (
        <TileLayer
          url={BASE_LAYERS[0].url}
          attribution={BASE_LAYERS[0].attribution}
          maxZoom={BASE_LAYERS[0].maxZoom}
        />
      )}

      {showMarker && (
        <Marker position={position} icon={pin} title={label}>
          <Popup>{label}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
