import Pager, { PageGone } from "@/components/catalog/Pager";
import ResultsSearch from "@/components/catalog/ResultsSearch";
import ViewToggle from "@/components/catalog/ViewToggle";
import { CardKind } from "@/components/catalog/cards";
import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import Partners from "@/components/site/Partners";
import { Skeleton } from "@/components/ui/field";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { searchRestaurants } from "@/lib/api";
import { restaurantHref } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media";
import { baseMinor, price } from "@/lib/money";
import { PAGE_SIZE, pageParam } from "@/lib/paging";
import { pushQuery } from "@/lib/query";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Restaurant } from "@/typescript/interface/domain.interface";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bike, Clock, RotateCw, Star, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";

/**
 * Radix refuses an empty-string Select value — it reserves "" for clearing the
 * selection — so "all cities" travels as a sentinel and is mapped back to an
 * absent query param. Same pattern, and same reason, as the search widget.
 */
const ANY = "__any";
const toSelect = (v?: string) => v || ANY;
const fromSelect = (v: string) => (v === ANY ? "" : v);

/**
 * Restaurants list.
 *
 * Not built on `SearchResults` like the other verticals: that component runs on
 * `Listing`/`Hotel` and a filter sidebar of stars and cabins, none of which a
 * restaurant has. A restaurant is chosen by city and cuisine in about two
 * seconds, so the page is a list and a pair of selects rather than a search.
 * A list by default, like every results page; a visitor who prefers the grid
 * can have it for the rest of the visit.
 */
export default function RestaurantsPage() {
  const { t, locale, currency, view = "list" } = usePrefs();
  const router = useRouter();
  const grid = view === "grid";

  const raw = router.query as Record<string, string | string[] | undefined>;
  const q = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = Array.isArray(v) ? v[0] : v;
    return out;
  }, [raw]);

  const params = useMemo(
    () => ({
      q: q.q,
      city: q.destination || q.city,
      cuisine: q.cuisine,
      sort: q.sort,
      page: pageParam(q.page),
      limit: PAGE_SIZE
    }),
    [q]
  );

  const { data, isPending: loading, isPlaceholderData, isFetching, isError, refetch } = useQuery({
    queryKey: ["restaurants", params],
    queryFn: ({ signal }) => searchRestaurants(params, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  // A search that found nothing does not stand in for the next one: skeletons.
  const isPending = loading || (isPlaceholderData && !items.length);
  const pages = data?.pages ?? Math.ceil(total / PAGE_SIZE);

  // Not a fixed list, so a cuisine the office stops serving stops being offered
  // without a deploy (§15). Over every restaurant, as the API counts them: a
  // page's own thirty would hide the rest. An API older than that sends none,
  // and the page's are better than nothing.
  const cuisines = data?.facets?.cuisines ?? [...new Set(items.flatMap((r) => r.cuisines))].sort();
  const cities = data?.facets?.cities ?? [...new Set(items.map((r) => r.city))].sort();

  // A new city, cuisine or search word starts again at its first page.
  const setParam = (key: string, value: string) =>
    pushQuery({
      [key]: value || undefined,
      // The city a search brought along (?destination=) gives way to the one picked here.
      ...(key === "city" ? { destination: undefined } : {})
    });

  const title = locale === "fr" ? "Restaurants et livraison en RDC" : "Restaurants and delivery in the DRC";
  const description =
    locale === "fr"
      ? "Commandez des plats congolais et continentaux à Kinshasa, Lubumbashi et Goma. Livraison à domicile, paiement en espèces à la livraison."
      : "Order Congolese and continental food in Kinshasa, Lubumbashi and Goma. Home delivery, cash on delivery.";

  return (
    <Layout title={title} description={description}>
      <div className="container-site py-8">
        <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: t("nav.restaurants") }]} />

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[30px] leading-tight text-brand-900 sm:text-[38px]">
              {t("nav.restaurants")}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-base text-ink-500">
              {isPending ? (
                <Skeleton className="h-4 w-28" />
              ) : (
                <span>
                  <strong className="font-semibold text-ink-900">{total}</strong>{" "}
                  {locale === "fr" ? "restaurants livrent chez vous" : "restaurants deliver to you"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <InlineSelect
              ariaLabel={t("results.city")}
              value={toSelect(params.city)}
              onValueChange={(v) => setParam("city", fromSelect(v))}
              options={[
                { value: ANY, label: locale === "fr" ? "Toutes les villes" : "All cities" },
                ...cities.map((c) => ({ value: c, label: c }))
              ]}
              triggerClassName="rounded-xl px-4 py-2.5 shadow-xs"
            />
            <InlineSelect
              ariaLabel={locale === "fr" ? "Cuisine" : "Cuisine"}
              value={toSelect(params.cuisine)}
              onValueChange={(v) => setParam("cuisine", fromSelect(v))}
              options={[
                { value: ANY, label: locale === "fr" ? "Toutes les cuisines" : "All cuisines" },
                ...cuisines.map((c) => ({ value: c, label: c }))
              ]}
              triggerClassName="rounded-xl px-4 py-2.5 shadow-xs"
            />
            <ViewToggle value={view} />
          </div>
        </div>

        <ResultsSearch className="mb-6 max-w-xl" />

        {isError ? (
          <div className="rounded-card bg-bad-100 p-8 text-center ring-1 ring-bad-600/20 ring-inset">
            <AlertTriangle className="mx-auto mb-3 size-8 text-bad-600" />
            <p className="font-bold text-brand-900">{t("common.error")}</p>
            <button type="button" onClick={() => refetch()} className="btn btn-md btn-dark mt-5">
              <RotateCw className="size-4" />
              {t("common.retry")}
            </button>
          </div>
        ) : isPending ? (
          <div className={grid ? GRID : "space-y-4"}>
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={cn("surface flex animate-fade-in flex-col overflow-hidden", !grid && "flex-row")}
              >
                <Skeleton className={cn("h-44 rounded-none", !grid && "h-auto w-28 shrink-0 sm:w-64")} />
                <div className="flex-1 space-y-3 p-5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : total > 0 && !items.length ? (
          <PageGone />
        ) : !items.length ? (
          /* §1: an empty result says what to do next, never just "0 results". */
          <div className="rounded-card bg-brand-50 p-10 text-center ring-1 ring-brand-100 ring-inset">
            <UtensilsCrossed className="mx-auto mb-3 size-8 text-brand-500" />
            <p className="text-lg font-bold text-brand-900">
              {q.q
                ? t("results.noMatch", { q: q.q })
                : locale === "fr"
                  ? "Aucun restaurant ne livre encore ici"
                  : "No restaurant delivers here yet"}
            </p>
            {!q.q && (
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">
                {locale === "fr"
                  ? "Nous ajoutons des cuisines chaque semaine. Essayez une autre ville en attendant."
                  : "We add kitchens every week. Try another city in the meantime."}
              </p>
            )}
            <button
              type="button"
              onClick={() => (q.q ? setParam("q", "") : router.push("/restaurants"))}
              className="btn btn-md btn-dark mt-5"
            >
              {q.q
                ? t("results.clearSearch")
                : locale === "fr"
                  ? "Voir toutes les villes"
                  : "See all cities"}
            </button>
          </div>
        ) : (
          <div
            className={cn(
              "motion-settle transition-opacity duration-200",
              grid ? GRID : "space-y-4",
              isFetching ? "opacity-55" : "opacity-100"
            )}
          >
            {items.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} currency={currency} locale={locale} row={!grid} />
            ))}
            <Pager page={params.page} pages={pages} total={total} />
          </div>
        )}
      </div>

      <Partners />
    </Layout>
  );
}

const GRID = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

/** A tile in the grid; with `row`, the same card laid out image-left for the list. */
function RestaurantCard({
  restaurant: r,
  currency,
  locale,
  row
}: {
  restaurant: Restaurant;
  currency: Parameters<typeof price>[1];
  locale: string;
  row?: boolean;
}) {
  // Cheapest active zone: the number a customer weighs before tapping in.
  const cheapestFee = r.deliveryZones.length
    ? r.deliveryZones.reduce((a, b) => (baseMinor(a.fee) <= baseMinor(b.fee) ? a : b))
    : null;

  return (
    <Link
      href={restaurantHref(r)}
      className={cn(
        "surface motion-rise group flex flex-col overflow-hidden transition-shadow hover:shadow-lg",
        // Image-left on a phone too: stacked, a row is the grid's tile again and
        // the toggle would change nothing on the screen most visitors use.
        row && "flex-row"
      )}
    >
      <div className={cn("relative h-44 overflow-hidden bg-ink-50", row && "h-auto w-28 shrink-0 sm:w-64")}>
        <Image
          src={mediaUrl(r.images[0])}
          alt=""
          fill
          sizes={row ? "(max-width: 640px) 112px, 256px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <CardKind kind="RESTAURANT" />
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-900">{r.name.fr || r.name.en}</h2>
          {r.rating ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-700">
              <Star className="size-4 fill-accent-500 text-accent-500" />
              {r.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-ink-500">
          {r.cuisines.join(" · ")}
          {r.cuisines.length ? " · " : ""}
          {r.city}
        </p>
        <p className="line-clamp-2 text-sm text-ink-500">{r.description.fr || r.description.en}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-sm text-ink-700">
          {cheapestFee && (
            <span className="flex items-center gap-1.5">
              <Bike className="size-4 text-brand-500" />
              {locale === "fr" ? "dès" : "from"} {price(cheapestFee.fee, currency, locale)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-brand-500" />
            {r.prepTimeMinutes + (cheapestFee?.etaMinutes ?? 0)} min
          </span>
        </div>
      </div>
    </Link>
  );
}
