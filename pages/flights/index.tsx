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

export default function FlightsPage({ facets }: Props) {
  const { t, locale } = usePrefs();
  return (
    <SearchResults
      vertical="FLIGHT"
      heroLabel={t("nav.flights")}
      title={locale === "fr" ? "Vols intérieurs en RDC" : "Domestic flights in the DRC"}
      description={
        locale === "fr"
          ? "Vols entre Kinshasa, Lubumbashi, Goma, Bukavu et Kisangani : choisissez votre date et l'heure du vol. Tarifs adulte, enfant et bébé, paiement à notre agence."
          : "Flights between Kinshasa, Lubumbashi, Goma, Bukavu and Kisangani: choose your date and flight time. Adult, child and baby fares, pay at our office."
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
