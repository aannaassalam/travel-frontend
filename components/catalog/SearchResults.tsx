import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import SearchWidget from "@/components/search/SearchWidget";
import { Skeleton } from "@/components/ui/field";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { searchHotels, searchListings } from "@/lib/api";
import { resultsLabel } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { Vertical } from "@/typescript/interface/domain.interface";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo } from "react";
import EmptyState from "./EmptyState";
import Filters, { FilterSection } from "./Filters";
import LeadForm from "./LeadForm";
import { HotelRow, ResultRow } from "./cards";

/**
 * One results page for all six verticals.
 *
 * Every filter change is a real request to `/api/v1`, so the skeletons below
 * are not decoration — they are what the page looks like while the server is
 * actually working. `keepPreviousData` means the previous results stay on
 * screen and dim rather than collapsing to a blank page, which is the
 * difference between a filter that feels instant and one that feels broken.
 */
export default function SearchResults({
  vertical,
  title,
  description,
  filters,
  priceRange,
  heroLabel
}: {
  vertical: Vertical;
  title: string;
  description: string;
  filters: FilterSection[];
  priceRange: [number, number];
  heroLabel: string;
}) {
  const { t, locale } = usePrefs();
  const router = useRouter();

  // A repeated param (?stars=4&stars=5) arrives as an array. Collapsing it here
  // means a hand-edited or crawler-mangled URL degrades to the first value
  // rather than throwing further down.
  const raw = router.query as Record<string, string | string[] | undefined>;
  const q = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(raw)) {
      out[key] = Array.isArray(value) ? value[0] : value;
    }
    return out;
  }, [raw]);

  const params = useMemo(
    () => ({
      vertical,
      destination: q.destination,
      origin: q.origin,
      cabin: q.cabin,
      // §1.2: multi-city launches as Request-to-Book, so it is never a filter.
      tripType: q.tripType === "MULTI_CITY" ? undefined : q.tripType,
      propertyType: q.propertyType,
      operator: q.operator,
      category: q.category,
      transmission: q.transmission,
      withDriver: q.withDriver,
      stars: q.stars,
      amenities: q.amenities,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
      bedrooms: q.bedrooms ? Number(q.bedrooms) : undefined,
      adults: q.adults ? Number(q.adults) : undefined,
      sort: q.sort ?? "recommended",
      from: q.from,
      to: q.to,
      limit: 40
    }),
    [vertical, q]
  );

  // Two queries rather than one returning a union: hotels and listings have
  // different shapes, and a union here would push a cast into every consumer.
  const isHotel = vertical === "HOTEL";
  const shared = { placeholderData: keepPreviousData, staleTime: 60_000 };

  const hotelQuery = useQuery({
    queryKey: ["hotels", params],
    queryFn: ({ signal }) => searchHotels(params, { signal }),
    enabled: isHotel,
    ...shared
  });
  const listingQuery = useQuery({
    queryKey: ["listings", vertical, params],
    queryFn: ({ signal }) => searchListings(params, { signal }),
    enabled: !isHotel,
    ...shared
  });

  const active = isHotel ? hotelQuery : listingQuery;
  const { isPending, isFetching, isError, refetch } = active;
  const count = active.data?.total ?? 0;
  const searchSummary = [q.origin, q.destination, q.from, q.to].filter(Boolean).join(" · ");

  function setSort(value: string) {
    router.push({ pathname: router.pathname, query: { ...q, sort: value } }, undefined, {
      scroll: false
    });
  }

  const sortOptions: [string, string][] = [
    ["recommended", "results.sortRecommended"],
    ["price_asc", "results.sortPriceAsc"],
    ["price_desc", "results.sortPriceDesc"],
    ["rating", "results.sortRating"],
    ...(vertical === "FLIGHT" || vertical === "BUS"
      ? ([["departure", "results.sortDeparture"]] as [string, string][])
      : [])
  ];

  return (
    <Layout title={title} description={description}>
      <SearchWidget vertical={vertical} variant="compact" initial={q as Record<string, string>} />

      <div className="container-site py-8">
        <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: heroLabel }]} />

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[30px] leading-tight text-brand-900 sm:text-[38px]">
              {heroLabel}
            </h1>
            {/* Not a <p>: the loading state puts a <Skeleton> (a div) in here,
                and a div inside a p is invalid HTML — the browser closes the p
                early and the DOM stops matching what the server sent, which
                surfaces as a hydration error. It was already a flex row, so a
                div is also the more honest element. */}
            <div className="mt-2 flex items-center gap-2 text-base text-ink-500">
              {isPending ? (
                <Skeleton className="h-4 w-28" />
              ) : (
                <>
                  <strong className="font-semibold text-ink-900">
                    {resultsLabel(locale, count)}
                  </strong>
                  {searchSummary && <span>· {searchSummary}</span>}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-ink-500">{t("results.sort")}</span>
            <InlineSelect
              ariaLabel={t("results.sort")}
              value={q.sort ?? "recommended"}
              onValueChange={setSort}
              options={sortOptions.map(([value, key]) => ({ value, label: t(key) }))}
              triggerClassName="rounded-xl px-4 py-2.5 shadow-xs"
            />
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <Filters sections={filters} priceBounds={priceRange} />

          <div className="min-w-0 flex-1">
            {isError ? (
              <div className="rounded-card bg-bad-100 p-8 text-center ring-1 ring-bad-600/20 ring-inset">
                <AlertTriangle className="mx-auto mb-3 size-8 text-bad-600" />
                <p className="font-bold text-brand-900">{t("common.error")}</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-700">
                  {locale === "fr"
                    ? "Le catalogue est momentanément injoignable. Réessayez dans un instant."
                    : "The catalogue is briefly unreachable. Try again in a moment."}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="btn btn-md btn-dark mt-5"
                >
                  <RotateCw className="size-4" />
                  {t("common.retry")}
                </button>
              </div>
            ) : isPending ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : count === 0 ? (
              <EmptyState
                vertical={vertical}
                query={searchSummary}
                // Flagged by the search box when the place typed is not one we
                // service, so this page can say so plainly instead of looking
                // like everything sold out.
                unservicedPlace={
                  router.query.enquiry === "1"
                    ? String(router.query.destination || router.query.origin || "")
                    : undefined
                }
              />
            ) : (
              <div
                /*
                 * Two different motions, doing two different jobs.
                 *
                 * `motion-settle` runs once, when results first take over from
                 * the skeletons - a hand-off rather than a jump cut.
                 *
                 * The dim is for refetches: a filter click should feel like a
                 * nudge, not a page reload, so the list stays put and fades
                 * rather than collapsing back to skeletons.
                 */
                className={`motion-settle space-y-4 transition-opacity duration-200 ${
                  isFetching ? "opacity-55" : "opacity-100"
                }`}
              >
                {isHotel
                  ? hotelQuery.data?.items.map((h) => <HotelRow key={h.id} hotel={h} />)
                  : listingQuery.data?.items.map((l) => <ResultRow key={l.id} listing={l} />)}

                {/* §1: stock is thin by design, so the lead capture belongs on
                    every results page — not only when the search returns none. */}
                <section
                  id="request"
                  className="scroll-mt-24 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset lg:p-8"
                >
                  <h2 className="text-lg font-bold text-brand-900">
                    {locale === "fr"
                      ? "Vous ne trouvez pas ce que vous cherchez ?"
                      : "Not finding what you need?"}
                  </h2>
                  <p className="mb-5 mt-1 max-w-2xl text-sm text-ink-700">{t("empty.body")}</p>
                  <div className="rounded-xl bg-white p-6">
                    <LeadForm
                      kind="REQUEST_TO_BOOK"
                      vertical={vertical}
                      compact
                      defaultMessage={searchSummary}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

/** Shaped like a result row, so the layout does not jump when data lands. */
function RowSkeleton() {
  return (
    <div className="surface flex animate-fade-in flex-col overflow-hidden sm:flex-row">
      <Skeleton className="h-44 rounded-none sm:h-auto sm:w-64" />
      <div className="flex-1 space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="space-y-3 bg-ink-50/60 p-5 sm:w-60">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

