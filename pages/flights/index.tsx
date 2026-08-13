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

export default function FlightsPage({ facets }: Props) {
  const { t, locale } = usePrefs();
  return (
    <SearchResults
      vertical="FLIGHT"
      heroLabel={t("nav.flights")}
      title={locale === "fr" ? "Vols intérieurs en RDC" : "Domestic flights in the DRC"}
      description={
        locale === "fr"
          ? "Offres de vols achetées à l'avance entre Kinshasa, Lubumbashi, Goma, Bukavu et Kisangani. Places réelles, prix fermes, paiement mobile money ou espèces."
          : "Flight offers bought in advance between Kinshasa, Lubumbashi, Goma, Bukavu and Kisangani. Real seats, firm prices, mobile money or cash."
      }
      priceRange={bounds(facets, "FLIGHT")}
      filters={[
        {
          key: "cabin",
          label: t("search.cabin"),
          type: "radio",
          options: [
            { value: "ECONOMY", label: t("cabin.ECONOMY") },
            { value: "BUSINESS", label: t("cabin.BUSINESS") }
          ]
        },
        {
          key: "tripType",
          label: t("search.tripType"),
          type: "radio",
          options: [
            { value: "ONE_WAY", label: t("search.oneWay") },
            { value: "RETURN", label: t("search.return") }
          ]
        },
        {
          key: "operator",
          label: t("results.airline"),
          type: "radio",
          options: facets.carriers.map((c) => ({ value: c, label: c }))
        }
      ]}
    />
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { facets: await safely(() => getFacets(), EMPTY_FACETS) },
  revalidate: 300
});
