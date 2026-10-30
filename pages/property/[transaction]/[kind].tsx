import { PropertyRow, PropertyTile } from "@/components/catalog/cards";
import EmptyState from "@/components/catalog/EmptyState";
import LeadForm from "@/components/catalog/LeadForm";
import Pager, { PageGone } from "@/components/catalog/Pager";
import ResultsSearch from "@/components/catalog/ResultsSearch";
import ViewToggle from "@/components/catalog/ViewToggle";
import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import Partners from "@/components/site/Partners";
import { CardSkeleton, Skeleton } from "@/components/ui/field";
import { AlertTriangle, RotateCw } from "lucide-react";
import { safely, searchListings } from "@/lib/api";
import { PAGE_SIZE, pageParam } from "@/lib/paging";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Listing } from "@/typescript/interface/domain.interface";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";

/**
 * §11.1 property sub-routes:
 *   /property/sale/houses, /property/sale/land,
 *   /property/rent/apartments, /property/rent/houses, /property/rent/land
 *
 * These exist for SEO — "maison à vendre Kinshasa" is a search someone types,
 * and a query-string filter on /property does not rank for it. Slugs are
 * stable; §11.4 forbids changing one without a 301.
 */

const ROUTES = [
  {
    transaction: "sale",
    kind: "houses",
    propertyType: "HOUSE_SALE",
    fr: { h1: "Maisons à vendre en RDC", lead: "Villas et maisons familiales à Kinshasa, Lubumbashi et Matadi, avec titre foncier vérifié." },
    en: { h1: "Houses for sale in the DRC", lead: "Villas and family houses in Kinshasa, Lubumbashi and Matadi, with verified title." }
  },
  {
    transaction: "sale",
    kind: "land",
    propertyType: "LAND_SALE",
    fr: { h1: "Terrains à vendre en RDC", lead: "Parcelles bornées et viabilisées, plan cadastral disponible." },
    en: { h1: "Land for sale in the DRC", lead: "Surveyed, serviced plots with a cadastral plan available." }
  },
  {
    transaction: "rent",
    kind: "apartments",
    propertyType: "APARTMENT_RENT",
    fr: { h1: "Appartements à louer en RDC", lead: "Appartements meublés et non meublés en résidence sécurisée." },
    en: { h1: "Apartments to rent in the DRC", lead: "Furnished and unfurnished apartments in secure residences." }
  },
  {
    transaction: "rent",
    kind: "houses",
    propertyType: "HOUSE_RENT",
    fr: { h1: "Maisons à louer en RDC", lead: "Maisons en location longue durée, bail d'un an minimum." },
    en: { h1: "Houses to rent in the DRC", lead: "Long-term house rentals, one-year minimum lease." }
  },
  {
    transaction: "rent",
    kind: "land",
    propertyType: "LAND_RENT",
    fr: { h1: "Terrains à louer en RDC", lead: "Terrains agricoles et commerciaux en bail de trois à neuf ans." },
    en: { h1: "Land to rent in the DRC", lead: "Agricultural and commercial land on three-to-nine-year leases." }
  }
] as const;

interface Props {
  /** The first page, as crawled. */
  listings: Listing[];
  total: number;
  copy: { fr: { h1: string; lead: string }; en: { h1: string; lead: string } };
  transaction: string;
  kind: string;
  propertyType: string;
}

export default function PropertyCategory({
  listings,
  total: builtTotal,
  copy,
  transaction,
  kind,
  propertyType
}: Props) {
  const { t, locale, view = "list" } = usePrefs();
  const grid = view === "grid";
  const c = locale === "en" ? copy.en : copy.fr;
  const router = useRouter();
  const q = typeof router.query.q === "string" ? router.query.q : "";
  const page = pageParam(router.query.page);

  // The static list is the first page as crawled. A search, or another page,
  // is a live request — the same one /property makes, narrowed to this kind.
  const live = Boolean(q) || page > 1;
  const { data, isFetching, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ["listings", "PROPERTY", propertyType, q, page],
    queryFn: ({ signal }) =>
      searchListings({ vertical: "PROPERTY", propertyType, q, page, limit: PAGE_SIZE }, { signal }),
    enabled: live,
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });
  const items = live ? (data?.items ?? []) : listings;
  const total = live ? (data?.total ?? 0) : builtTotal;
  const pages = (live && data?.pages) || Math.ceil(total / PAGE_SIZE);
  // Also while the last search, which found nothing, stands in for the next.
  const pending = live && !isError && (!data || (isPlaceholderData && !data.items.length));

  return (
    <Layout title={c.h1} description={c.lead}>
      <div className="border-b border-ink-100/70 bg-brand-50">
        <div className="container-site py-8">
          <Breadcrumbs
            items={[
              { label: t("common.home"), href: "/" },
              { label: t("nav.property"), href: "/property" },
              { label: c.h1 }
            ]}
          />
          <h1 className="display text-2xl text-brand-900 sm:text-3xl">
            {c.h1}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-ink-700">{c.lead}</p>
        </div>
      </div>

      <div className="container-site py-8">
        <ResultsSearch className="mb-5 max-w-xl" />

        {/* A div, not a p: the skeleton is a div and a div inside a p is
            invalid HTML — see the same note in SearchResults. */}
        <div className="mb-4 flex items-center justify-between gap-3 text-sm text-ink-500">
          {pending ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <span>{`${total} ${locale === "fr" ? "biens" : "listings"}`}</span>
          )}
          <ViewToggle value={view} />
        </div>

        {live && isError ? (
          <div className="rounded-card bg-bad-100 p-8 text-center ring-1 ring-bad-600/20 ring-inset">
            <AlertTriangle className="mx-auto mb-3 size-8 text-bad-600" />
            <p className="font-bold text-brand-900">{t("common.error")}</p>
            <button type="button" onClick={() => refetch()} className="btn btn-md btn-dark mt-5">
              <RotateCw className="size-4" />
              {t("common.retry")}
            </button>
          </div>
        ) : pending ? (
          <div className={grid ? GRID : "space-y-4"}>
            {Array.from({ length: 3 }, (_, i) =>
              grid ? <CardSkeleton key={i} /> : <Skeleton key={i} className="h-44 w-full" />
            )}
          </div>
        ) : total > 0 && items.length === 0 ? (
          <PageGone />
        ) : items.length === 0 ? (
          <div className="space-y-6">
            {q && (
              <p className="rounded-card bg-ink-50 px-5 py-4 text-sm font-semibold text-ink-700 ring-1 ring-ink-100 ring-inset">
                {t("results.noMatch", { q })}
              </p>
            )}
            <EmptyState vertical="PROPERTY" query={q || `${transaction} ${kind}`} />
          </div>
        ) : (
          <div
            className={cn(
              "transition-opacity duration-200",
              grid ? GRID : "space-y-4",
              isFetching ? "opacity-55" : "opacity-100"
            )}
          >
            {items.map((l) =>
              grid ? <PropertyTile key={l.id} listing={l} /> : <PropertyRow key={l.id} listing={l} />
            )}
            <Pager page={page} pages={pages} total={total} />
          </div>
        )}

        <section className="mt-10 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset">
          <h2 className="text-lg font-bold text-brand-900">
            {locale === "fr"
              ? "Vous cherchez autre chose ?"
              : "Looking for something else?"}
          </h2>
          <p className="mb-4 mt-1 max-w-2xl text-sm text-ink-700">
            {locale === "fr"
              ? "Décrivez le bien recherché — quartier, budget, nombre de chambres. Notre agent vous rappelle avec ce qui est disponible, y compris les biens non publiés."
              : "Describe what you are after — area, budget, bedrooms. Our agent calls you back with what is available, including listings we have not published."}
          </p>
          <div className="rounded-lg bg-white p-5">
            <LeadForm kind="PROPERTY" vertical="PROPERTY" compact />
          </div>
        </section>
      </div>

      <Partners />
    </Layout>
  );
}

/** No filter sidebar on these pages: three tiles a row from a laptop up. */
const GRID = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: ROUTES.map((r) => ({
    params: { transaction: r.transaction, kind: r.kind }
  })),
  fallback: false
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const route = ROUTES.find(
    (r) => r.transaction === params?.transaction && r.kind === params?.kind
  );
  if (!route) return { notFound: true };
  // One filtered query per landing page. These exist for SEO, so they are
  // rendered server-side with the real result set rather than fetched client
  // -side after paint.
  const { items, total } = await safely(
    () => searchListings({ vertical: "PROPERTY", propertyType: route.propertyType, limit: PAGE_SIZE }),
    { items: [], total: 0, limit: 0 }
  );
  return {
    props: {
      listings: items,
      total,
      copy: { fr: route.fr, en: route.en },
      transaction: route.transaction,
      kind: route.kind,
      propertyType: route.propertyType
    },
    revalidate: 300
  };
};
