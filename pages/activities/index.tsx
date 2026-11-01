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
  facets.priceBounds[key] ?? [0, 3_000_000]; // francs (about 1 000 $)

export default function ActivitiesPage({ facets }: Props) {
  const { t } = usePrefs();
  return (
    <SearchResults
      vertical="ACTIVITY"
      heroLabel={t("nav.activities")}
      title={t("pg.activities.title")}
      description={t("pg.activities.description")}
      priceRange={bounds(facets, "ACTIVITY")}
      filters={[
        {
          key: "destination",
          label: t("results.city"),
          type: "radio",
          options: facets.cities.map((c) => ({ value: c, label: c }))
        }
      ]}
    />
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { facets: await safely(() => getFacets(), EMPTY_FACETS) },
  revalidate: 300
});
