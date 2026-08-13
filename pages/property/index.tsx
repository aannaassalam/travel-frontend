import SearchResults from "@/components/catalog/SearchResults";
import { Facets, getFacets, safely } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { GetStaticProps } from "next";

interface Props {
  facets: Facets;
}

/** Filter options come from the API, derived from what is actually on sale. */
const EMPTY_FACETS: Facets = {
  cities: [],
  carriers: [],
  operators: [],
  categories: [],
  vehicleClasses: [],
  hotelAmenities: [],
  priceBounds: {}
};

const bounds = (facets: Facets, key: string): [number, number] =>
  facets.priceBounds[key] ?? [0, 100000];

export const PROPERTY_OPTIONS = [
  { value: "HOUSE_SALE", fr: "Maison à vendre", en: "House for sale" },
  { value: "LAND_SALE", fr: "Terrain à vendre", en: "Land for sale" },
  { value: "APARTMENT_RENT", fr: "Appartement à louer", en: "Apartment to rent" },
  { value: "HOUSE_RENT", fr: "Maison à louer", en: "House to rent" },
  { value: "LAND_RENT", fr: "Terrain à louer", en: "Land to rent" }
];

export default function PropertyPage({ facets }: Props) {
  const { t, locale } = usePrefs();
  return (
    <SearchResults
      vertical="PROPERTY"
      heroLabel={t("nav.property")}
      title={locale === "fr" ? "Immobilier en RDC" : "Property in the DRC"}
      description={
        locale === "fr"
          ? "Maisons, appartements et terrains à vendre ou à louer à Kinshasa, Lubumbashi, Goma et Matadi. Contact direct avec notre agent, sans réservation en ligne."
          : "Houses, apartments and land for sale or rent in Kinshasa, Lubumbashi, Goma and Matadi. Direct contact with our agent, no online booking."
      }
      priceRange={bounds(facets, "PROPERTY")}
      filters={[
        {
          key: "propertyType",
          label: t("search.propertyType"),
          type: "radio",
          options: PROPERTY_OPTIONS.map((o) => ({
            value: o.value,
            label: locale === "fr" ? o.fr : o.en
          }))
        },
        {
          key: "bedrooms",
          label: t("results.bedrooms"),
          type: "radio",
          options: [2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+` }))
        }
      ]}
    />
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { facets: await safely(() => getFacets(), EMPTY_FACETS) },
  revalidate: 300
});
