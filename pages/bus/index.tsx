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

export default function BusPage({ facets }: Props) {
  const { t, locale } = usePrefs();
  return (
    <SearchResults
      vertical="BUS"
      heroLabel={t("nav.bus")}
      title={locale === "fr" ? "Bus et cars en RDC" : "Buses and coaches in the DRC"}
      description={
        locale === "fr"
          ? "Places de bus achetées à l'avance sur les grandes liaisons : Kinshasa–Matadi, Kinshasa–Kikwit, Lubumbashi–Kolwezi, Goma–Bukavu."
          : "Coach seats bought in advance on the main routes: Kinshasa–Matadi, Kinshasa–Kikwit, Lubumbashi–Kolwezi, Goma–Bukavu."
      }
      priceRange={bounds(facets, "BUS")}
      filters={[
        {
          key: "operator",
          label: t("results.operator"),
          type: "radio",
          options: facets.operators.map((o) => ({ value: o, label: o }))
        },
        {
          key: "category",
          label: t("results.category"),
          type: "radio",
          options: facets.vehicleClasses.map((c) => ({ value: c, label: c }))
        }
      ]}
    />
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { facets: await safely(() => getFacets(), EMPTY_FACETS) },
  revalidate: 300
});
