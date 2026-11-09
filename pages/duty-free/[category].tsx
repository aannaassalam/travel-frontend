import Pager, { PageGone } from "@/components/catalog/Pager";
import ResultsSearch from "@/components/catalog/ResultsSearch";
import ViewToggle from "@/components/catalog/ViewToggle";
import { DutyFreeBanner, DutyFreeCartBar, ProductCard } from "@/components/dutyFree/parts";
import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { CardSkeleton, Skeleton } from "@/components/ui/field";
import { getDutyFreeCategories, searchDutyFreeProducts } from "@/lib/dutyFree";
import { resultsLabel } from "@/lib/i18n";
import { PAGE_SIZE, pageParam } from "@/lib/paging";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

/**
 * One category: the products of every shop in it, each marked with who sells
 * it. Search and paging live in the address, as on every results page; the
 * basket takes products from several shops at once.
 */
export default function DutyFreeCategoryPage() {
  const { t, lz, locale, view } = usePrefs();
  const router = useRouter();
  const grid = view === "grid";
  const slug = typeof router.query.category === "string" ? router.query.category : "";
  const q = typeof router.query.q === "string" ? router.query.q : undefined;
  const page = pageParam(router.query.page);

  const cats = useQuery({
    queryKey: ["duty-free", "categories"],
    queryFn: ({ signal }) => getDutyFreeCategories({ signal }),
    staleTime: 30_000
  });
  const params = { category: slug, q, page, limit: PAGE_SIZE };
  const { data, isPending: loading, isPlaceholderData, isFetching, isError, refetch } = useQuery({
    queryKey: ["duty-free", "products", params],
    queryFn: ({ signal }) => searchDutyFreeProducts(params, { signal }),
    enabled: router.isReady && Boolean(slug),
    placeholderData: keepPreviousData,
    // Re-read when the page opens again: prices, stock and promotions change in the admin.
    refetchOnMount: true,
    staleTime: 30_000
  });

  const categories = cats.data ?? [];
  const category = categories.find((c) => c.slug === slug || c.id === slug);
  const name = category ? lz(category.name) : t("nav.dutyFree");
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? Math.ceil(total / PAGE_SIZE);
  const isPending = loading || (isPlaceholderData && !items.length);

  return (
    <Layout title={`${name} — ${t("nav.dutyFree")}`} description={t("pg.dutyFree.categoryLead")}>
      <DutyFreeBanner title={name} lead={t("pg.dutyFree.categoryLead")} />

      {/* Bottom padding clears the basket bar. */}
      <div className="container-site py-8 pb-28">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.dutyFree"), href: "/duty-free" },
            { label: name }
          ]}
        />

        {/* The other categories, one tap away. */}
        {categories.length > 1 && (
          <nav aria-label={t("pg.dutyFree.categories")} className="mb-6 flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = c.id === category?.id;
              return (
                <Link
                  key={c.id}
                  href={`/duty-free/${encodeURIComponent(c.slug)}`}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors ring-inset",
                    on ? "bg-brand-900 text-white ring-brand-900" : "bg-white text-brand-900 ring-ink-100 hover:ring-brand-500"
                  )}
                >
                  {lz(c.name)}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-base text-ink-500">
            {isPending ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <strong className="font-semibold text-ink-900">{resultsLabel(locale, total)}</strong>
            )}
          </div>
          <ViewToggle value={view} />
        </div>

        <ResultsSearch className="mb-6" />

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
            {Array.from({ length: grid ? 6 : 4 }, (_, i) =>
              grid ? <CardSkeleton key={i} /> : <Skeleton key={i} className="h-36 w-full" />
            )}
          </div>
        ) : total > 0 && !items.length ? (
          <PageGone />
        ) : !items.length ? (
          <div className="rounded-card bg-brand-50 p-10 text-center ring-1 ring-brand-100 ring-inset">
            <ShoppingBag className="mx-auto mb-3 size-8 text-brand-500" />
            <p className="text-lg font-bold text-brand-900">
              {q ? t("results.noMatch", { q }) : t("pg.dutyFree.emptyTitle")}
            </p>
            {!q && <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">{t("pg.dutyFree.emptyBody")}</p>}
            <Link href="/duty-free" className="btn btn-md btn-dark mt-5">
              {t("pg.dutyFree.browse")}
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              "motion-settle transition-opacity duration-200",
              grid ? GRID : "space-y-4",
              isFetching ? "opacity-55" : "opacity-100"
            )}
          >
            {items.map((p) => (
              <ProductCard key={p.id} product={p} row={!grid} />
            ))}
            <Pager page={page} pages={pages} total={total} />
          </div>
        )}
      </div>

      <DutyFreeCartBar />
    </Layout>
  );
}

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";
