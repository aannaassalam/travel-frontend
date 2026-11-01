import { PROPERTY_LABEL } from "@/components/catalog/cards";
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

export default function PropertyPage({ facets }: Props) {
  const { t } = usePrefs();
  return (
    <SearchResults
      vertical="PROPERTY"
      heroLabel={t("nav.property")}
      title={t("pg.property.title")}
      description={t("pg.property.description")}
      priceRange={bounds(facets, "PROPERTY")}
      filters={[
        {
          key: "propertyType",
          label: t("search.propertyType"),
          type: "radio",
          // The card labels' keys, in their order.
          options: Object.entries(PROPERTY_LABEL).map(([value, key]) => ({ value, label: t(key) }))
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
