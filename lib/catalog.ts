import { Hotel, Listing, Vertical } from "@/typescript/interface/domain.interface";

/**
 * Presentation helpers for the catalogue.
 *
 * Searching, filtering and sorting all live on the server now (see `lib/api.ts`
 * and travel-backend's `/api/v1` catalogue routes). What is left here is the
 * URL vocabulary and the destination list — both presentation concerns that
 * belong to the frontend, not to the API.
 */

export const CITIES = [
  { slug: "kinshasa", name: "Kinshasa", iata: "FIH", image: "/img/photos/kinshasa.webp", province: "Kinshasa" },
  { slug: "lubumbashi", name: "Lubumbashi", iata: "FBM", image: "/img/photos/lubumbashi.webp", province: "Haut-Katanga" },
  { slug: "goma", name: "Goma", iata: "GOM", image: "/img/photos/goma.webp", province: "Nord-Kivu" },
  { slug: "bukavu", name: "Bukavu", iata: "BKY", image: "/img/photos/bukavu.webp", province: "Sud-Kivu" },
  { slug: "matadi", name: "Matadi", iata: "MAT", image: "/img/photos/matadi.webp", province: "Kongo-Central" },
  { slug: "kisangani", name: "Kisangani", iata: "FKI", image: "/img/photos/kisangani.webp", province: "Tshopo" },
  { slug: "mbuji-mayi", name: "Mbuji-Mayi", iata: "MJM", image: "/img/photos/mbuji-mayi.webp", province: "Kasaï-Oriental" },
  { slug: "kananga", name: "Kananga", iata: "KGA", image: "/img/photos/kananga.webp", province: "Kasaï-Central" }
] as const;

export const VERTICAL_SLUGS: Record<Vertical, string> = {
  FLIGHT: "flights",
  BUS: "bus",
  CAR: "cars",
  HOTEL: "hotels",
  ACTIVITY: "activities",
  PROPERTY: "property",
  RESTAURANT: "restaurants"
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
  RESTAURANT: ""
};

export function detailHref(l: Pick<Listing, "vertical" | "slug">): string {
  return `/${VERTICAL_SLUGS[l.vertical]}/${DETAIL_SEGMENT[l.vertical]}/${l.slug}`;
}

export const hotelHref = (h: Pick<Hotel, "slug">) => `/hotels/hotel/${h.slug}`;

/** A stable image for a city tile, falling back to the brand banner. */
export const cityImage = (name: string) =>
  CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase())?.image ??
  "/img/banner-1.svg";

export const restaurantHref = (r: { slug: string }) => `/restaurants/${r.slug}`;
