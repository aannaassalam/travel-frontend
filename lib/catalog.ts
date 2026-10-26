import { facetLabel, translate } from "@/lib/i18n";
import {
  Hotel,
  Listing,
  ListingAttributes,
  Locale,
  Vertical
} from "@/typescript/interface/domain.interface";

/**
 * Presentation helpers for the catalogue.
 *
 * Searching, filtering and sorting all live on the server now (see `lib/api.ts`
 * and travel-backend's `/api/v1` catalogue routes). What is left here is the
 * URL vocabulary and the destination list — both presentation concerns that
 * belong to the frontend, not to the API.
 */

/**
 * Serviced cities, with the coordinates of each city centre.
 *
 * The centre is what a map falls back to when a specific hotel or restaurant
 * has no coordinates of its own: it answers "which part of the country is
 * this" without claiming to know the street, which a pin would.
 */
export const CITIES = [
  { slug: "kinshasa", name: "Kinshasa", iata: "FIH", image: "/img/photos/kinshasa.webp", province: "Kinshasa", geo: { lat: -4.4419, lng: 15.2663 } },
  { slug: "lubumbashi", name: "Lubumbashi", iata: "FBM", image: "/img/photos/lubumbashi.webp", province: "Haut-Katanga", geo: { lat: -11.6876, lng: 27.5026 } },
  { slug: "goma", name: "Goma", iata: "GOM", image: "/img/photos/goma.webp", province: "Nord-Kivu", geo: { lat: -1.6585, lng: 29.2206 } },
  { slug: "bukavu", name: "Bukavu", iata: "BKY", image: "/img/photos/bukavu.webp", province: "Sud-Kivu", geo: { lat: -2.5083, lng: 28.8608 } },
  { slug: "matadi", name: "Matadi", iata: "MAT", image: "/img/photos/matadi.webp", province: "Kongo-Central", geo: { lat: -5.8167, lng: 13.45 } },
  { slug: "kisangani", name: "Kisangani", iata: "FKI", image: "/img/photos/kisangani.webp", province: "Tshopo", geo: { lat: 0.5153, lng: 25.19 } },
  { slug: "mbuji-mayi", name: "Mbuji-Mayi", iata: "MJM", image: "/img/photos/mbuji-mayi.webp", province: "Kasaï-Oriental", geo: { lat: -6.136, lng: 23.5898 } },
  { slug: "kananga", name: "Kananga", iata: "KGA", image: "/img/photos/kananga.webp", province: "Kasaï-Central", geo: { lat: -5.896, lng: 22.4166 } }
] as const;

export const VERTICAL_SLUGS: Record<Vertical, string> = {
  FLIGHT: "flights",
  BUS: "bus",
  CAR: "cars",
  HOTEL: "hotels",
  ACTIVITY: "activities",
  PROPERTY: "property",
  RESTAURANT: "restaurants",
  TRANSFER: "transfers"
};

/** The detail-page segment for each vertical, per the §11.1 architecture. */
const DETAIL_SEGMENT: Record<Vertical, string> = {
  FLIGHT: "offer",
  BUS: "route",
  CAR: "vehicle",
  ACTIVITY: "activity",
  PROPERTY: "listing",
  HOTEL: "hotel",
  // Restaurants are reached at /restaurants/<slug> directly: there is one
  // page per restaurant and no intermediate listing to disambiguate.
  RESTAURANT: "",
  // A transfer has no listing at all: /transfers is the one booking page.
  TRANSFER: ""
};

export function detailHref(l: Pick<Listing, "vertical" | "slug">): string {
  return `/${VERTICAL_SLUGS[l.vertical]}/${DETAIL_SEGMENT[l.vertical]}/${l.slug}`;
}

export const hotelHref = (h: Pick<Hotel, "slug">) => `/hotels/hotel/${h.slug}`;

/** A stable image for a city tile, falling back to the brand banner. */
export const cityImage = (name: string) =>
  CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase())?.image ??
  "/img/banner-1.svg";

/** A city's centre, for a map with no exact coordinates. */
export const cityGeo = (name?: string) =>
  name
    ? CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase())?.geo
    : undefined;

export const restaurantHref = (r: { slug: string }) => `/restaurants/${r.slug}`;

/**
 * The car types the office picks from, stored as these codes in a car's
 * `attributes.category`. A car saved before the list keeps its own text,
 * which is shown as it was typed.
 */
export const CAR_TYPES = ["SUV", "BERLINE", "BUS", "PICKUP", "MINIBUS", "TRUCK", "LUXE"];

export const carTypeLabel = (locale: Locale, value: string) =>
  CAR_TYPES.includes(value) ? translate(locale, `carType.${value}`) : facetLabel(locale, value);

/**
 * The sizes a property shows, as the office enters them per type: land one,
 * its plot (`areaSqm`, or a plot size copied in before that rule); a house
 * its built area and its plot; an apartment its area.
 */
export function propertySizes(a: ListingAttributes): { kind: "area" | "builtArea" | "plot"; sqm: number }[] {
  const type = a.propertyType;
  if (type === "LAND_SALE" || type === "LAND_RENT") {
    const plot = a.areaSqm || a.plotSizeSqm;
    return plot ? [{ kind: "plot", sqm: plot }] : [];
  }
  if (type === "HOUSE_SALE" || type === "HOUSE_RENT") {
    return [
      ...(a.areaSqm ? [{ kind: "builtArea" as const, sqm: a.areaSqm }] : []),
      ...(a.plotSizeSqm ? [{ kind: "plot" as const, sqm: a.plotSizeSqm }] : [])
    ];
  }
  return a.areaSqm ? [{ kind: "area", sqm: a.areaSqm }] : [];
}

/** "1 800 m²", grouped the DRC way. */
export const sqm = (n: number) => `${n.toLocaleString("fr-FR")} m²`;
