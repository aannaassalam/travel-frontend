import Pager, { PageGone } from "@/components/catalog/Pager";
import ViewToggle from "@/components/catalog/ViewToggle";
import { HotelRow, HotelTile, RestaurantCard, ResultRow, ResultTile } from "@/components/catalog/cards";
import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { CardSkeleton, Skeleton } from "@/components/ui/field";
import { searchHotels, searchListings, searchRestaurants } from "@/lib/api";
import { resultsLabel } from "@/lib/i18n";
import { PAGE_SIZE, pageParam } from "@/lib/paging";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, Tag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

/**
 * Every running promotion, whatever it sells, 30 a page: the old price the
 * office typed struck through beside the one charged. Asked from the browser,
 * like /restaurants — a promotion starts and ends by the day, and a page built
 * ahead of time would keep one that has ended.
 */
export default function PromotionsPage() {
  const { t, locale, view = "list" } = usePrefs();
  const router = useRouter();
  const grid = view === "grid";
  const page = pageParam(router.query.page);

  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["listings", "promotions", page],
    queryFn: ({ signal }) => searchListings({ promo: true, page, limit: PAGE_SIZE }, { signal }),
    // The page number is in the address only once the router has read it.
    enabled: router.isReady,
    placeholderData: keepPreviousData,
    // Re-read when the page opens again, so a promotion the office just set or ended shows.
    refetchOnMount: true,
    staleTime: 30_000
  });
  // Hotels and restaurants on promotion (a room or a dish): few, so all of
  // them above the offers, on the first page only. Read on every page, so the
  // count above is the same on each.
  const first = page === 1;
  const hotelsQ = useQuery({
    queryKey: ["hotels", "promotions"],
    queryFn: ({ signal }) => searchHotels({ promo: true, limit: PAGE_SIZE }, { signal }),
    enabled: router.isReady,
    refetchOnMount: true,
    staleTime: 30_000
  });
  const restaurantsQ = useQuery({
    queryKey: ["restaurants", "promotions"],
    queryFn: ({ signal }) => searchRestaurants({ promo: true, limit: PAGE_SIZE }, { signal }),
    enabled: router.isReady,
    refetchOnMount: true,
    staleTime: 30_000
  });
  const hotels = first ? (hotelsQ.data?.items ?? []) : [];
  const restaurants = first ? (restaurantsQ.data?.items ?? []) : [];
  const places = hotels.length + restaurants.length;

  const count = data?.total ?? 0;
  const pages = data?.pages ?? Math.ceil(count / PAGE_SIZE);
  const items = data?.items ?? [];
  const title = t("home.promotions");

  return (
    <Layout title={title} description={t("home.promotionsSub")}>
      <div className="container-site py-8">
        <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: title }]} />

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[30px] leading-tight text-brand-900 sm:text-[38px]">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] text-ink-500">{t("home.promotionsSub")}</p>
            {/* A div: the skeleton is one, and a div inside a p is invalid HTML. */}
            <div className="mt-1 text-base">
              {isPending || hotelsQ.isLoading || restaurantsQ.isLoading ? (
                <Skeleton className="h-4 w-28" />
              ) : (
                <strong className="font-semibold text-ink-900">
                  {resultsLabel(locale, count + (hotelsQ.data?.total ?? 0) + (restaurantsQ.data?.total ?? 0))}
                </strong>
              )}
            </div>
          </div>
          <ViewToggle value={view} />
        </div>

        {/* A failed re-read keeps the list: the panel is for when there is nothing to show. */}
        {isError && !data ? (
          <div className="rounded-card bg-bad-100 p-8 text-center ring-1 ring-bad-600/20 ring-inset">
            <AlertTriangle className="mx-auto mb-3 size-8 text-bad-600" />
            <p className="font-bold text-brand-900">{t("common.error")}</p>
            <button type="button" onClick={() => refetch()} className="btn btn-md btn-dark mt-5">
              <RotateCw className="size-4" />
              {t("common.retry")}
            </button>
          </div>
        ) : isPending || hotelsQ.isLoading || restaurantsQ.isLoading ? (
          <div className={grid ? GRID : "space-y-4"}>
            {Array.from({ length: 3 }, (_, i) =>
              grid ? <CardSkeleton key={i} /> : <Skeleton key={i} className="h-44 w-full" />
            )}
          </div>
        ) : count === 0 && !places ? (
          <div className="rounded-card bg-brand-50 p-10 text-center ring-1 ring-brand-100 ring-inset">
            <Tag className="mx-auto mb-3 size-8 text-brand-500" />
            <p className="text-lg font-bold text-brand-900">{t("promotions.empty")}</p>
            <Link href="/" className="btn btn-md btn-dark mt-5">
              {t("account.browse")}
            </Link>
          </div>
        ) : !items.length && !places ? (
          <PageGone />
        ) : (
          <div className="space-y-10">
            {hotels.length > 0 && (
              <Section title={t("nav.hotels")}>
                <div className={grid ? GRID : "space-y-4"}>
                  {hotels.map((h) =>
                    grid ? <HotelTile key={h.id} hotel={h} /> : <HotelRow key={h.id} hotel={h} />
                  )}
                </div>
              </Section>
            )}
            {restaurants.length > 0 && (
              <Section title={t("nav.restaurants")}>
                <div className={grid ? GRID : "space-y-4"}>
                  {restaurants.map((r) => (
                    <RestaurantCard key={r.id} restaurant={r} row={!grid} />
                  ))}
                </div>
              </Section>
            )}
            {items.length > 0 && (
              <Section title={places ? t("promotions.offers") : undefined}>
                <div
                  className={cn(
                    "motion-settle transition-opacity duration-200",
                    grid ? GRID : "space-y-4",
                    isFetching ? "opacity-55" : "opacity-100"
                  )}
                >
                  {items.map((l) =>
                    grid ? <ResultTile key={l.id} listing={l} /> : <ResultRow key={l.id} listing={l} />
                  )}
                  <Pager page={page} pages={pages} total={count} />
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

/** No filter sidebar here: three tiles a row from a laptop up. */
const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** A group of promotions under its heading; no heading when it is the only group. */
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-4 text-xl font-bold text-brand-900">{title}</h2>}
      {children}
    </section>
  );
}
