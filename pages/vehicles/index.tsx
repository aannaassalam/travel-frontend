import Filters, { FilterSection } from "@/components/catalog/Filters";
import Pager, { PageGone } from "@/components/catalog/Pager";
import ResultsSearch from "@/components/catalog/ResultsSearch";
import ViewToggle from "@/components/catalog/ViewToggle";
import { SaleVehicleCard } from "@/components/catalog/cards";
import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import Partners from "@/components/site/Partners";
import { CardSkeleton, Skeleton } from "@/components/ui/field";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { getVehicleFacets, searchVehicles } from "@/lib/api";
import { km, specText } from "@/lib/catalog";
import { resultsLabel } from "@/lib/i18n";
import { PAGE_SIZE, pageParam } from "@/lib/paging";
import { pushQuery, queryNow } from "@/lib/query";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CarFront, RotateCw } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo } from "react";

const SORTS: [string, string][] = [
  ["newest", "cmp.vehicle.sortNewest"],
  ["priceAsc", "results.sortPriceAsc"],
  ["priceDesc", "results.sortPriceDesc"],
  ["yearDesc", "cmp.vehicle.sortYear"],
  ["mileageAsc", "cmp.vehicle.sortMileage"]
];

/** `spec.<key>` and `spec.<key>.min|max`: the only free-form params that reach the API (§8). */
const SPEC_PARAM = /^spec\.[a-z0-9_-]+(\.(min|max))?$/i;
/** Everything else the URL may carry for the API, as the API names it. */
const PLAIN = ["city", "parking", "type", "make", "model", "yearMin", "yearMax", "mileageMax", "condition", "accessories", "q"];

const list = (v?: string | string[]) => (typeof v === "string" ? v.split(",").filter(Boolean) : []);

/**
 * Vehicles for sale: the deep search. Every filter lives in the URL (shareable,
 * Back works) and is a real request — the sidebar is the site's own `Filters`,
 * its towns, parkings, makes and specs from GET /vehicles/facets. The towns are
 * also quick chips at the top: /vehicles?city=Kinshasa is "what is on sale here".
 */
export default function VehiclesPage() {
  const { t, lz, locale, view = "list" } = usePrefs();
  const router = useRouter();
  const grid = view === "grid";

  const raw = router.query as Record<string, string | string[] | undefined>;
  const q = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = Array.isArray(v) ? v[0] : v;
    return out;
  }, [raw]);

  const params = useMemo(() => {
    const p: Record<string, string | number | undefined> = {
      // The sidebar's price slider is the site's own: minPrice/maxPrice in the URL.
      priceMin: q.minPrice,
      priceMax: q.maxPrice,
      sort: q.sort,
      page: pageParam(q.page),
      limit: PAGE_SIZE
    };
    for (const k of PLAIN) p[k] = q[k];
    for (const [k, v] of Object.entries(q)) if (SPEC_PARAM.test(k)) p[k] = v;
    return p;
  }, [q]);

  const { data, isPending: loading, isPlaceholderData, isFetching, isError, refetch } = useQuery({
    queryKey: ["vehicle-search", params],
    queryFn: ({ signal }) => searchVehicles(params, { signal }),
    placeholderData: keepPreviousData,
    // Re-read when the page opens again: prices and promotions change in the admin.
    refetchOnMount: true,
    staleTime: 30_000
  });
  const { data: facets } = useQuery({
    queryKey: ["vehicle-facets"],
    queryFn: ({ signal }) => getVehicleFacets({ signal }),
    staleTime: 60_000
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  // A search that found nothing does not stand in for the next one: skeletons.
  const isPending = loading || (isPlaceholderData && !items.length);
  const pages = data?.pages ?? Math.ceil(total / PAGE_SIZE);
  const filtered = Object.keys(q).some((k) => k !== "sort" && k !== "page" && q[k]);

  const makes = list(q.make);
  const sections: FilterSection[] = [];
  if (facets) {
    sections.push(
      {
        key: "city",
        label: t("results.city"),
        type: "radio",
        options: facets.cities.map((c) => ({ value: c.city, label: c.city, count: c.count })),
        // A parking is in one town.
        alsoSet: () => ({ parking: undefined })
      },
      {
        key: "parking",
        label: t("cmp.vehicle.parking"),
        type: "radio",
        options: facets.parkings
          .filter((p) => !q.city || p.city === q.city)
          .map((p) => ({ value: p.id, label: q.city ? lz(p.name) : `${lz(p.name)} · ${p.city}`, count: p.count }))
      },
      {
        key: "type",
        label: t("cmp.vehicle.type"),
        type: "checkbox",
        options: facets.types.map((x) => ({ value: x.slug, label: lz(x.name), count: x.count }))
      },
      {
        key: "make",
        label: t("cmp.vehicle.make"),
        type: "checkbox",
        options: facets.makes.map((m) => ({ value: m.make, label: m.make, count: m.count })),
        // The models of a make no longer ticked go with it.
        alsoSet: (next) => {
          const keep = new Set(
            facets.makes.filter((m) => next.includes(m.make)).flatMap((m) => m.models.map((x) => x.model))
          );
          return { model: list(queryNow().model).filter((m) => keep.has(m)).join(",") || undefined };
        }
      },
      {
        // Offered once a make is ticked: the models of the makes ticked.
        key: "model",
        label: t("cmp.vehicle.model"),
        type: "checkbox",
        options: facets.makes
          .filter((m) => makes.includes(m.make))
          .flatMap((m) =>
            m.models.map((x) => ({
              value: x.model,
              label: makes.length > 1 ? `${m.make} ${x.model}` : x.model,
              count: x.count
            }))
          )
      }
    );
    if (facets.year) {
      sections.push({
        key: "year",
        label: t("cmp.vehicle.year"),
        type: "range",
        bounds: facets.year,
        minKey: "yearMin",
        maxKey: "yearMax",
        step: 1
      });
    }
    if (facets.mileage) {
      sections.push({
        key: "mileage",
        label: t("cmp.vehicle.mileageMax"),
        type: "range",
        bounds: facets.mileage,
        maxKey: "mileageMax",
        format: (v) => km(v, locale)
      });
    }
    sections.push({
      key: "condition",
      label: t("cmp.vehicle.condition"),
      type: "radio",
      options: facets.conditions.map((c) => ({
        value: c.condition,
        label: t(`cmp.vehicle.${c.condition}`),
        count: c.count
      }))
    });
    for (const s of facets.specs) {
      if (s.valueType === "NUMBER" && s.range) {
        sections.push({
          key: `spec.${s.key}`,
          label: lz(s.name),
          type: "range",
          bounds: s.range,
          minKey: `spec.${s.key}.min`,
          maxKey: `spec.${s.key}.max`,
          format: (v) => specText({ value: v, unit: s.unit }, locale)
        });
      } else if (s.valueType === "CHOICE" && s.choices) {
        sections.push({
          key: `spec.${s.key}`,
          label: lz(s.name),
          type: "checkbox",
          options: s.choices.map((c) => ({ value: c.key, label: lz(c.label), count: c.count }))
        });
      }
    }
    sections.push({
      key: "accessories",
      label: t("cmp.vehicle.accessories"),
      type: "checkbox",
      options: facets.accessories.map((a) => ({ value: a.key, label: lz(a.name), count: a.count }))
    });
  }

  const heading = q.city ? t("pg.vehicles.inTown", { city: q.city }) : t("nav.vehicles");
  const towns = facets?.cities ?? [];

  return (
    <Layout title={q.city ? heading : t("pg.vehicles.title")} description={t("pg.vehicles.description")}>
      <div className="container-site py-8">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            ...(q.city
              ? [{ label: t("nav.vehicles"), href: "/vehicles" }, { label: q.city }]
              : [{ label: t("nav.vehicles") }])
          ]}
        />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[30px] leading-tight text-brand-900 sm:text-[38px]">{heading}</h1>
            <div className="mt-2 flex items-center gap-2 text-base text-ink-500">
              {isPending ? (
                <Skeleton className="h-4 w-28" />
              ) : (
                <strong className="font-semibold text-ink-900">{resultsLabel(locale, total)}</strong>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-ink-500">{t("results.sort")}</span>
            <InlineSelect
              ariaLabel={t("results.sort")}
              value={q.sort ?? "newest"}
              onValueChange={(v) => void pushQuery({ sort: v === "newest" ? undefined : v })}
              options={SORTS.map(([value, key]) => ({ value, label: t(key) }))}
              triggerClassName="rounded-xl px-4 py-2.5 shadow-xs"
            />
            <ViewToggle value={view} />
          </div>
        </div>

        {/* "Available vehicles per town": one tap each, with how many. */}
        {towns.length > 0 && (
          <div role="group" aria-label={t("results.city")} className="mb-8 flex flex-wrap gap-2">
            {[{ city: "", count: towns.reduce((n, c) => n + c.count, 0) }, ...towns].map((c) => {
              const on = (q.city ?? "") === c.city;
              return (
                <button
                  key={c.city || "all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => void pushQuery({ city: c.city || undefined, parking: undefined })}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors ring-inset",
                    on ? "bg-brand-900 text-white ring-brand-900" : "bg-white text-brand-900 ring-ink-100 hover:ring-brand-500"
                  )}
                >
                  {c.city || t("pg.vehicles.allTowns")}
                  <span className={cn("tnum ms-1.5 text-xs", on ? "text-white/70" : "text-ink-500")}>{c.count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-8 lg:flex-row">
          <Filters
            sections={sections}
            priceBounds={facets?.price}
            priceLabel={t("results.priceRangeProperty")}
          />

          <div className="min-w-0 flex-1">
            <ResultsSearch className="mb-5" />

            {/* A failed re-read keeps the list: the panel is for when there is nothing to show. */}
            {isError && !data ? (
              <div className="rounded-card bg-bad-100 p-8 text-center ring-1 ring-bad-600/20 ring-inset">
                <AlertTriangle className="mx-auto mb-3 size-8 text-bad-600" />
                <p className="font-bold text-brand-900">{t("common.error")}</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-700">{t("cmp.results.unreachable")}</p>
                <button type="button" onClick={() => refetch()} className="btn btn-md btn-dark mt-5">
                  <RotateCw className="size-4" />
                  {t("common.retry")}
                </button>
              </div>
            ) : isPending ? (
              <div className={grid ? GRID : "space-y-4"}>
                {Array.from({ length: grid ? 6 : 5 }, (_, i) =>
                  grid ? (
                    <CardSkeleton key={i} />
                  ) : (
                    <div key={i} className="surface flex animate-fade-in flex-row overflow-hidden">
                      <Skeleton className="h-auto w-32 shrink-0 rounded-none sm:w-64" />
                      <div className="flex-1 space-y-3 p-5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-3/5" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-6 w-2/5" />
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : total > 0 && !items.length ? (
              <PageGone />
            ) : !items.length ? (
              /* §1: an empty result says what to do next, never just "0 results". */
              <div className="rounded-card bg-brand-50 p-10 text-center ring-1 ring-brand-100 ring-inset">
                <CarFront className="mx-auto mb-3 size-8 text-brand-500" />
                <p className="text-lg font-bold text-brand-900">
                  {q.q ? t("results.noMatch", { q: q.q }) : t("pg.vehicles.emptyTitle")}
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">{t("pg.vehicles.emptyBody")}</p>
                {filtered && (
                  <button type="button" onClick={() => router.push("/vehicles")} className="btn btn-md btn-dark mt-5">
                    {t("results.clearFilters")}
                  </button>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "motion-settle transition-opacity duration-200",
                  grid ? GRID : "space-y-4",
                  isFetching ? "opacity-55" : "opacity-100"
                )}
              >
                {items.map((v) => (
                  <SaleVehicleCard key={v.id} vehicle={v} row={!grid} />
                ))}
                <Pager page={params.page as number} pages={pages} total={total} />
              </div>
            )}
          </div>
        </div>
      </div>

      <Partners />
    </Layout>
  );
}

/** As the other results pages beside their filters: one column on a phone, three on a wide screen. */
const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3";
