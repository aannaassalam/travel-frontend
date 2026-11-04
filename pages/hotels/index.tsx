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
  facets.priceBounds[key] ?? [0, 3_000_000]; // francs (about 1 000 $)

export default function HotelsPage({ facets }: Props) {
  const { t, locale } = usePrefs();
  return (
    <SearchResults
      vertical="HOTEL"
      heroLabel={t("nav.hotels")}
      title={t("pg.hotels.title")}
      description={t("pg.hotels.description")}
      priceRange={bounds(facets, "HOTEL")}
      filters={[
        {
          key: "stars",
          label: t("results.stars"),
          type: "checkbox",
          // The ratings the hotels on sale actually have, 1 and 2 stars included.
          options: (facets.hotelStars ?? [5, 4, 3, 2, 1]).map((n) => ({
            value: String(n),
            label: n === 1 ? t("pg.hotels.star1") : t("pg.hotels.stars", { n })
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
