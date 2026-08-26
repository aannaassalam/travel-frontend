import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { Skeleton } from "@/components/ui/field";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { searchRestaurants } from "@/lib/api";
import { restaurantHref } from "@/lib/catalog";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
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
 * seconds, so the page is a grid and a pair of selects rather than a search.
 */
export default function RestaurantsPage() {
  const { t, locale, currency } = usePrefs();
  const router = useRouter();

  const raw = router.query as Record<string, string | string[] | undefined>;
  const q = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = Array.isArray(v) ? v[0] : v;
    return out;
  }, [raw]);

  const params = useMemo(
    () => ({ city: q.destination || q.city, cuisine: q.cuisine, sort: q.sort, limit: 40 }),
    [q]
  );

  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["restaurants", params],
    queryFn: ({ signal }) => searchRestaurants(params, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  const items = data?.items ?? [];

  // Derived from what came back rather than a fixed list, so a cuisine the
  // office stops serving stops being offered without a deploy (§15).
  const cuisines = useMemo(
    () => Array.from(new Set(items.flatMap((r) => r.cuisines))).sort(),
    [items]
  );
  const cities = useMemo(
    () => Array.from(new Set(items.map((r) => r.city))).sort(),
    [items]
  );

  const setParam = (key: string, value: string) =>
    router.push(
      { pathname: router.pathname, query: { ...q, [key]: value || undefined } },
      undefined,
      { scroll: false }
    );

  const title = locale === "fr" ? "Restaurants et livraison en RDC" : "Restaurants and delivery in the DRC";
  const description =
    locale === "fr"
      ? "Commandez des plats congolais et continentaux à Kinshasa, Lubumbashi et Goma. Livraison à domicile, paiement mobile money ou espèces à la livraison."
      : "Order Congolese and continental food in Kinshasa, Lubumbashi and Goma. Home delivery, mobile money or cash on delivery.";

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
                  <strong className="font-semibold text-ink-900">{data?.total ?? 0}</strong>{" "}
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
          </div>
        </div>

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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="surface animate-fade-in overflow-hidden">
                <Skeleton className="h-44 rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : !items.length ? (
          /* §1: an empty result says what to do next, never just "0 results". */
          <div className="rounded-card bg-brand-50 p-10 text-center ring-1 ring-brand-100 ring-inset">
            <UtensilsCrossed className="mx-auto mb-3 size-8 text-brand-500" />
            <p className="text-lg font-bold text-brand-900">
              {locale === "fr"
                ? "Aucun restaurant ne livre encore ici"
                : "No restaurant delivers here yet"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">
              {locale === "fr"
                ? "Nous ajoutons des cuisines chaque semaine. Essayez une autre ville en attendant."
                : "We add kitchens every week. Try another city in the meantime."}
            </p>
            <button
              type="button"
              onClick={() => router.push("/restaurants")}
              className="btn btn-md btn-dark mt-5"
            >
              {locale === "fr" ? "Voir toutes les villes" : "See all cities"}
            </button>
          </div>
        ) : (
          <div
            className={`motion-settle grid gap-6 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${
              isFetching ? "opacity-55" : "opacity-100"
            }`}
          >
            {items.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} currency={currency} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function RestaurantCard({
  restaurant: r,
  currency,
  locale
}: {
  restaurant: Restaurant;
  currency: Parameters<typeof price>[1];
  locale: string;
}) {
  // Cheapest active zone: the number a customer weighs before tapping in.
  const cheapestFee = r.deliveryZones.length
    ? r.deliveryZones.reduce((a, b) => ((a.fee.USD ?? 0) <= (b.fee.USD ?? 0) ? a : b))
    : null;

  return (
    <Link
      href={restaurantHref(r)}
      className="surface motion-rise group flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative h-44 overflow-hidden bg-ink-50">
        <Image
          src={r.images[0] ?? "/img/banner-1.svg"}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
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
