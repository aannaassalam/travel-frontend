import { Breadcrumbs, Price } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { CardSkeleton } from "@/components/ui/field";
import { flagOf } from "@/components/visa/status";
import { baseMinor } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { getVisaCatalogue, type VisaCountry } from "@/lib/visa";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Landmark,
  Lock,
  RotateCw,
  Stamp
} from "lucide-react";
import Link from "next/link";

const STEPS = [1, 2, 3, 4] as const;

/** The cheapest offer's fee and the span of processing times, for a country's card. */
function summary(c: VisaCountry) {
  const offers = [...c.offers].sort(
    (a, b) => baseMinor(a.serviceFee) - baseMinor(b.serviceFee)
  );
  const days = c.offers.map((o) => o.processingDays).filter((n) => n > 0);
  return {
    from: offers[0]?.serviceFee,
    min: days.length ? Math.min(...days) : 0,
    max: days.length ? Math.max(...days) : 0
  };
}

/**
 * E-Visa: what the service is, how it goes, and the countries it is open for.
 * A country opens the form already pointed at it.
 */
export default function EVisaPage() {
  const { t, lz } = usePrefs();
  const { signedIn } = useSession();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["visa-catalogue"],
    queryFn: ({ signal }) => getVisaCatalogue({ signal }),
    staleTime: 5 * 60_000
  });
  const countries = data?.countries ?? [];

  return (
    <Layout title={t("visa.title")} description={t("visa.description")}>
      <div className="bg-brand-900 text-white">
        <div className="container-site py-10 sm:py-14">
          <p className="eyebrow mb-3 flex items-center gap-2 text-accent-500">
            <Stamp className="size-4" aria-hidden="true" />
            {t("nav.evisa")}
          </p>
          <h1 className="display max-w-2xl text-[30px] leading-tight sm:text-[40px]">
            {t("visa.title")}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">
            {t("visa.description")}
          </p>
          {signedIn && (
            <Link
              href="/account/visas"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-500 hover:underline"
            >
              {t("account.visas")}
              <ArrowRight
                className="size-4 rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>
      </div>

      <div className="container-site py-8">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.evisa") }
          ]}
        />

        {/* How it goes: four numbered steps on one line, a timeline down the page on a phone. */}
        <section aria-labelledby="how" className="mb-12">
          <h2
            id="how"
            className="display mb-6 text-[24px] leading-tight text-brand-900 sm:text-[28px]"
          >
            {t("visa.how.title")}
          </h2>
          <ol className="grid gap-0 border-s-2 border-ink-100 ps-6 md:grid-cols-4 md:gap-8 md:border-s-0 md:border-t-2 md:ps-0 md:pt-6">
            {STEPS.map((n) => (
              <li key={n} className="relative pb-6 md:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute -start-[39px] top-0 grid size-7 place-items-center rounded-full bg-brand-900 text-sm font-bold text-white md:-top-[39px] md:start-0"
                >
                  {n}
                </span>
                <h3 className="font-bold text-brand-900">
                  <span className="sr-only">{n}. </span>
                  {t(`visa.how.${n}.title`)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {t(`visa.how.${n}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="countries">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="countries"
                className="display text-[24px] leading-tight text-brand-900 sm:text-[28px]"
              >
                {t("visa.countries.title")}
              </h2>
              <p className="mt-1 text-[15px] text-ink-500">
                {t("visa.countries.subtitle")}
              </p>
            </div>
          </div>

          {isError && !data ? (
            <div className="rounded-card bg-bad-100 p-8 text-center ring-1 ring-bad-600/20 ring-inset">
              <AlertTriangle className="mx-auto mb-3 size-8 text-bad-600" />
              <p className="font-bold text-brand-900">{t("common.error")}</p>
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : countries.length === 0 ? (
            <div className="surface p-10 text-center">
              <p className="font-semibold text-brand-900">
                {t("visa.countries.none")}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {t("visa.countries.noneBody")}
              </p>
              <Link href="/contact" className="btn btn-sm btn-dark mt-4">
                {t("visa.countries.contact")}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {countries.map((c) => {
                const s = summary(c);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/e-visa/apply?country=${c.code}`}
                      className="surface card-lift group flex h-full flex-col p-5"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-4xl leading-none"
                          aria-hidden="true"
                        >
                          {flagOf(c.code)}
                        </span>
                        <h3 className="min-w-0 text-lg font-bold text-brand-900">
                          {lz(c.name)}
                        </h3>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-ink-500">
                        {c.offers.map((o) => lz(o.visaType.name)).join(" · ")}
                      </p>
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
                        <div>
                          {s.from && (
                            <p className="text-sm text-ink-500">
                              {t("visa.countries.from")}{" "}
                              <Price
                                money={s.from}
                                className="text-lg font-bold text-brand-900"
                              />
                            </p>
                          )}
                          {s.max > 0 && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
                              <Clock className="size-3.5" aria-hidden="true" />
                              {s.min === s.max
                                ? t("visa.days", { n: s.max })
                                : t("visa.daysRange", {
                                    min: s.min,
                                    max: s.max
                                  })}
                            </p>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:text-brand-900">
                          {t("visa.countries.apply")}
                          <ArrowRight
                            className="size-4 rtl:-scale-x-100"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* What the fee is and is not, and what happens to the passport scan: said up front. */}
        <div className="mt-12 grid gap-6 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset md:grid-cols-2">
          <p className="flex gap-3 text-[15px] text-ink-700">
            <Landmark
              className="mt-0.5 size-5 shrink-0 text-brand-500"
              aria-hidden="true"
            />
            <span>
              <strong className="block font-semibold text-brand-900">
                {t("visa.trust.feeTitle")}
              </strong>
              {t("visa.trust.feeBody")}
            </span>
          </p>
          <p className="flex gap-3 text-[15px] text-ink-700">
            <Lock
              className="mt-0.5 size-5 shrink-0 text-brand-500"
              aria-hidden="true"
            />
            <span>
              <strong className="block font-semibold text-brand-900">
                {t("visa.trust.privateTitle")}
              </strong>
              {t("visa.trust.privateBody")}
            </span>
          </p>
        </div>
      </div>
    </Layout>
  );
}
