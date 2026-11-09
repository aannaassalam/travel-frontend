import { DutyFreeBanner, DutyFreeCartBar } from "@/components/dutyFree/parts";
import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { CardSkeleton } from "@/components/ui/field";
import { getDutyFreeCategories } from "@/lib/dutyFree";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/**
 * Duty Free: the categories. Customers choose what, not where — a category
 * holds the products of every shop in it, so shops are never a step here.
 */
export default function DutyFreePage() {
  const { t, lz } = usePrefs();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["duty-free", "categories"],
    queryFn: ({ signal }) => getDutyFreeCategories({ signal }),
    refetchOnMount: true,
    staleTime: 30_000
  });
  const categories = data ?? [];

  return (
    <Layout title={t("pg.dutyFree.title")} description={t("pg.dutyFree.description")}>
      <DutyFreeBanner title={t("pg.dutyFree.title")} lead={t("pg.dutyFree.description")} />

      <div className="container-site py-8 pb-28">
        <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: t("nav.dutyFree") }]} />
        <h2 className="mb-5 text-xl font-bold text-brand-900">{t("pg.dutyFree.categories")}</h2>

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
          <div className={GRID}>
            {Array.from({ length: 6 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !categories.length ? (
          <div className="rounded-card bg-brand-50 p-10 text-center ring-1 ring-brand-100 ring-inset">
            <ShoppingBag className="mx-auto mb-3 size-8 text-brand-500" />
            <p className="text-lg font-bold text-brand-900">{t("pg.dutyFree.emptyTitle")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">{t("pg.dutyFree.emptyBody")}</p>
          </div>
        ) : (
          <ul className={`motion-settle ${GRID}`}>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/duty-free/${encodeURIComponent(c.slug)}`}
                  className="surface group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg"
                >
                  <div className="relative aspect-4/3 overflow-hidden bg-ink-50">
                    <Image
                      src={mediaUrl(c.image)}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-baseline justify-between gap-3 p-5">
                    <h3 className="text-lg font-bold text-brand-900">{lz(c.name)}</h3>
                    {typeof c.productCount === "number" && (
                      <span className="tnum shrink-0 text-sm text-ink-500">
                        {t(c.productCount === 1 ? "pg.dutyFree.count1" : "pg.dutyFree.count", { n: c.productCount })}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DutyFreeCartBar />
    </Layout>
  );
}

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";
