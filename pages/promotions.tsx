import Pager, { PageGone } from "@/components/catalog/Pager";
import ViewToggle from "@/components/catalog/ViewToggle";
import { ResultRow, ResultTile } from "@/components/catalog/cards";
import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { CardSkeleton, Skeleton } from "@/components/ui/field";
import { searchListings } from "@/lib/api";
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
    staleTime: 60_000
  });
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
              {isPending ? (
                <Skeleton className="h-4 w-28" />
              ) : (
                <strong className="font-semibold text-ink-900">{resultsLabel(locale, count)}</strong>
              )}
            </div>
          </div>
          <ViewToggle value={view} />
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
          <div className={grid ? GRID : "space-y-4"}>
            {Array.from({ length: 3 }, (_, i) =>
              grid ? <CardSkeleton key={i} /> : <Skeleton key={i} className="h-44 w-full" />
            )}
          </div>
        ) : count === 0 ? (
          <div className="rounded-card bg-brand-50 p-10 text-center ring-1 ring-brand-100 ring-inset">
            <Tag className="mx-auto mb-3 size-8 text-brand-500" />
            <p className="text-lg font-bold text-brand-900">{t("promotions.empty")}</p>
            <Link href="/" className="btn btn-md btn-dark mt-5">
              {t("account.browse")}
            </Link>
          </div>
        ) : !items.length ? (
          <PageGone />
        ) : (
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
        )}
      </div>
    </Layout>
  );
}

/** No filter sidebar here: three tiles a row from a laptop up. */
const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";
