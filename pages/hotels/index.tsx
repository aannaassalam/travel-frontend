import SearchResults from "@/components/catalog/SearchResults";
import { Facets, getFacets, safely } from "@/lib/api";
import { facetLabel } from "@/lib/i18n";
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

export default function HotelsPage({ facets }: Props) {
  const { t, locale } = usePrefs();
  return (
    <SearchResults
      vertical="HOTEL"
      heroLabel={t("nav.hotels")}
      title={locale === "fr" ? "Hôtels en RDC" : "Hotels in the DRC"}
      description={
        locale === "fr"
          ? "Chambres achetées à l'avance à Kinshasa, Lubumbashi, Goma, Bukavu et Matadi. Prix en USD, CDF ou EUR, paiement en espèces à notre agence."
          : "Rooms bought in advance in Kinshasa, Lubumbashi, Goma, Bukavu and Matadi. Prices in USD, CDF or EUR, pay in cash at our office."
      }
      priceRange={bounds(facets, "HOTEL")}
      filters={[
        {
          key: "stars",
          label: t("results.stars"),
          type: "checkbox",
          options: [5, 4, 3].map((n) => ({
            value: String(n),
            label: `${n} ${locale === "fr" ? "étoiles" : "stars"}`
          }))
        },
        {
          key: "amenities",
          label: t("results.amenities"),
          type: "checkbox",
          options: facets.hotelAmenities
            .slice(0, 10)
            // Stored in French; the filter value stays the stored string so
            // the query still matches, only the label is translated.
            .map((a) => ({ value: a, label: facetLabel(locale, a) }))
        }
      ]}
    />
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { facets: await safely(() => getFacets(), EMPTY_FACETS) },
  revalidate: 300
});
