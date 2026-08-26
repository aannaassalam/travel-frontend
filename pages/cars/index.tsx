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

export default function CarsPage({ facets }: Props) {
  const { t, locale } = usePrefs();
  return (
    <SearchResults
      vertical="CAR"
      heroLabel={t("nav.cars")}
      title={locale === "fr" ? "Location de voitures en RDC" : "Car hire in the DRC"}
      description={
        locale === "fr"
          ? "Voitures avec ou sans chauffeur à Kinshasa, Lubumbashi et Goma. 4x4, berlines, minibus et transferts aéroport."
          : "Cars with or without a driver in Kinshasa, Lubumbashi and Goma. 4x4s, saloons, minibuses and airport transfers."
      }
      priceRange={bounds(facets, "CAR")}
      filters={[
        {
          key: "category",
          label: t("results.category"),
          type: "radio",
          options: facets.categories.map((c) => ({ value: c, label: facetLabel(locale, c) }))
        },
        {
          key: "transmission",
          label: t("results.transmission"),
          type: "radio",
          options: [
            { value: "AUTOMATIC", label: locale === "fr" ? "Automatique" : "Automatic" },
            { value: "MANUAL", label: locale === "fr" ? "Manuelle" : "Manual" }
          ]
        },
        {
          key: "withDriver",
          label: locale === "fr" ? "Chauffeur" : "Driver",
          type: "radio",
          options: [
            { value: "true", label: locale === "fr" ? "Avec chauffeur" : "With driver" },
            { value: "false", label: locale === "fr" ? "Sans chauffeur" : "Self-drive" }
          ]
        }
      ]}
    />
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { facets: await safely(() => getFacets(), EMPTY_FACETS) },
  revalidate: 300
});
