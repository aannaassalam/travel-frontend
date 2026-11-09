import { Localized } from "@/typescript/interface/domain.interface";
import { Building2, CarFront, Hotel, type LucideIcon, UtensilsCrossed } from "lucide-react";
import { get } from "./api";
import { detailHref, hotelHref, restaurantHref } from "./catalog";

/**
 * The town map (/carte): every place with a map position in one town.
 * Mirrors travel-backend's GET /map/places. Of the listings only properties
 * have a pin (the admin's picker is offered for them alone).
 */

export const MAP_KINDS = ["HOTEL", "RESTAURANT", "PARKING", "PROPERTY"] as const;
export type MapKind = (typeof MAP_KINDS)[number];

/** Each kind's pin and chip: the service's own icon and colour, as in the header. */
export const KIND_LOOK: Record<MapKind, { Icon: LucideIcon; tint: string }> = {
  HOTEL: { Icon: Hotel, tint: "var(--color-v-hotel)" },
  RESTAURANT: { Icon: UtensilsCrossed, tint: "var(--color-v-restaurant)" },
  PARKING: { Icon: CarFront, tint: "var(--color-v-vehicle)" },
  PROPERTY: { Icon: Building2, tint: "var(--color-v-property)" }
};

export const isMapKind =(v: unknown): v is MapKind => MAP_KINDS.includes(v as MapKind);

export interface MapPlace {
  id: string;
  kind: MapKind;
  name: Localized | string;
  slug: string;
  lat: number;
  lng: number;
  image?: string;
  /** The address, when the office typed one. */
  subtitle?: string;
  /** A parking's vehicles on sale now. */
  vehicleCount?: number;
}

export interface MapAnswer {
  town: { name: string; lat?: number; lng?: number };
  items: MapPlace[];
}

export const getMapPlaces = (city: string, init?: RequestInit) =>
  get<MapAnswer>(`/map/places?${new URLSearchParams({ city })}`, init);

/** The page behind a pin: a parking opens the vehicles on sale there. */
export function placeHref(p: MapPlace, town: string): string {
  switch (p.kind) {
    case "HOTEL":
      return hotelHref(p);
    case "RESTAURANT":
      return restaurantHref(p);
    case "PROPERTY":
      return detailHref({ vertical: "PROPERTY", slug: p.slug });
    case "PARKING":
      return `/vehicles?${new URLSearchParams({ city: town, parking: p.id })}`;
  }
}

/** The "See on the map" link of a results page: its town when one is chosen, and its kind. */
export const mapHref = (kind: MapKind, city?: string) =>
  `/carte?${new URLSearchParams({ ...(city ? { city } : {}), kind })}`;
