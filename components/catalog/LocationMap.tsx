import { cityGeo } from "@/lib/catalog";
import { usePrefs } from "@/lib/prefs";
import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

/**
 * The map on a listing page.
 *
 * Leaflet, bundled from npm — no third-party script ever loads, which is what
 * §10.8's CSP is protecting. Tiles are a different matter: each one is a
 * request from the visitor's browser to OpenStreetMap, so an always-on map
 * hands the IP of every catalogue visitor to a third party. That is exactly why
 * this page previously shipped a placeholder grid and a text link.
 *
 * So the map is opt-in. The default state is the same drawn placeholder as
 * before and costs nothing; tiles load only once the visitor asks to see them.
 * Nobody is tracked for scrolling past a hotel, and anyone who actually wants
 * to know where it is gets a real map in one tap — with the text link still
 * there for people who would rather not load it at all.
 *
 * `ssr: false` is not optional: Leaflet touches `window` at import time and
 * server-rendering it throws.
 */

const Leaflet = dynamic(() => import("./LeafletCanvas"), {
  ssr: false,
  loading: () => <Placeholder />
});

/** The zero-cost default: drawn, not fetched. */
function Placeholder() {
  return (
    <div className="relative h-full bg-brand-100">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#1e5a8e_1px,transparent_1px),linear-gradient(90deg,#1e5a8e_1px,transparent_1px)] [background-size:32px_32px]" />
      <MapPin className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-brand-900" />
    </div>
  );
}

export interface LocationMapProps {
  geo?: { lat: number; lng: number };
  /** Used for the marker's popup and the map's accessible name. */
  label: string;
  /**
   * Falls back to this city's centre when the item has no coordinates.
   *
   * Most inventory is entered without a pin dropped on it, and "no map at all"
   * is a worse answer than "here is the town". The two cases are shown
   * differently — see below — so an approximate view is never mistaken for a
   * precise one.
   */
  city?: string;
  className?: string;
}

export default function LocationMap({ geo, label, city, className }: LocationMapProps) {
  const { locale } = usePrefs();
  const [shown, setShown] = useState(false);

  /**
   * Exact coordinates zoom to the street; a city fallback stays deliberately
   * wide and drops no pin, because a pin on a city centre is a claim we cannot
   * support. The caption below the button says which one the visitor is getting.
   */
  const approximate = !geo;
  const centre = geo ?? cityGeo(city);

  // Neither a pin nor a known city. The address line still tells them where it is.
  if (!centre) {
    return (
      <div className={className ?? "h-44"}>
        <Placeholder />
      </div>
    );
  }

  return (
    /*
      `isolate` is the fix for the map painting over the sticky header.
      Leaflet assigns its own stacking values — panes at 400, controls at 800,
      the corner containers at 1000 — which sail straight past the header's
      z-40. Creating a stacking context here traps all of that inside the
      wrapper, so the map can never escape its own box no matter what Leaflet
      does internally. Cheaper and far more robust than overriding half a dozen
      .leaflet-* z-indexes by hand.
    */
    <div className={`relative isolate z-0 ${className ?? "h-64"}`}>
      {shown ? (
        <Leaflet
          geo={centre}
          label={label}
          zoom={approximate ? 11 : 14}
          showMarker={!approximate}
        />
      ) : (
        <>
          <Placeholder />
          {/*
            The consent step, stated plainly rather than hidden in a cookie
            banner: loading the map is a request to someone else's server, and
            the visitor should know that before it happens.
          */}
          <button
            type="button"
            onClick={() => setShown(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-brand-900/45 text-white transition-colors hover:bg-brand-900/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="btn btn-sm bg-white text-brand-900 shadow-sm">
              {locale === "fr" ? "Afficher la carte" : "Show the map"}
            </span>
            <span className="max-w-[28ch] text-center text-xs text-white/85">
              {approximate
                ? locale === "fr"
                  ? "Quartier approximatif. Charge OpenStreetMap."
                  : "Approximate area. Loads OpenStreetMap."
                : locale === "fr"
                  ? "Charge les fonds de carte depuis OpenStreetMap."
                  : "Loads map tiles from OpenStreetMap."}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
