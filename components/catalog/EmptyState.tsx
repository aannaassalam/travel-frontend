import { usePrefs } from "@/lib/prefs";
import { Hotel, Listing, Vertical } from "@/typescript/interface/domain.interface";
import { SearchX } from "lucide-react";
import { DealTile, HotelTile } from "./cards";
import LeadForm from "./LeadForm";
import { NoResultsSpot } from "@/components/art/spots";

/**
 * §1: "the empty state is the most-used screen on this platform. Every
 * zero-result search must convert into nearby alternatives or a captured
 * Request-to-Book lead."
 *
 * So this is not a shrug and a magnifying glass. It is a lead form with
 * alternatives underneath, and it is deliberately the most designed empty
 * state in the codebase.
 */
export default function EmptyState({
  vertical,
  query,
  alternatives = [],
  hotelAlternatives = [],
  unservicedPlace
}: {
  vertical: Vertical;
  query?: string;
  alternatives?: Listing[];
  hotelAlternatives?: Hotel[];
  /**
   * Set when the customer searched somewhere outside the serviced network.
   * "We have not bought stock for this date" and "we do not go there at all"
   * are different messages, and conflating them makes the second look like bad
   * luck rather than a limit — so the copy below says which it is.
   */
  unservicedPlace?: string;
}) {
  const { t } = usePrefs();

  return (
    <div className="space-y-8">
      <div className="grid gap-6 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset lg:grid-cols-2 lg:p-8">
        <div>
          <NoResultsSpot className="mb-4 w-36 text-brand-900" />
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-brand-700">
            <SearchX className="size-4" />
            {unservicedPlace ? t("cmp.empty.outside") : t("empty.title")}
          </p>
          <h2 className="mt-4 text-2xl font-bold text-brand-900">{t("rtb.title")}</h2>
          <p className="mt-2 max-w-md text-[15px] text-ink-700">
            {unservicedPlace ? t("cmp.empty.outsideBody", { place: unservicedPlace }) : t("empty.body")}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink-700">
            {["cmp.empty.point1", "cmp.empty.point2", "cmp.empty.point3"].map((key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <LeadForm
            key={query}
            kind="REQUEST_TO_BOOK"
            vertical={vertical}
            compact
            defaultMessage={query ?? ""}
          />
        </div>
      </div>

      {(alternatives.length > 0 || hotelAlternatives.length > 0) && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-brand-900">{t("empty.nearby")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {alternatives.map((l) => (
              <DealTile key={l.id} listing={l} />
            ))}
            {hotelAlternatives.map((h) => (
              <HotelTile key={h.id} hotel={h} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
