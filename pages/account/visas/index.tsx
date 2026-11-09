import AccountLayout from "@/components/account/AccountLayout";
import { Price } from "@/components/site/bits";
import { flagOf, VisaBadges } from "@/components/visa/status";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { feeMoney, getMyVisaApplications, visaDay } from "@/lib/visa";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock, Stamp } from "lucide-react";
import Link from "next/link";

/** The signed-in customer's visa applications, newest first. */
export default function MyVisasPage() {
  const { t, lz, locale } = usePrefs();
  const { signedIn } = useSession();
  const {
    data = [],
    isPending,
    isError,
    refetch
  } = useQuery({
    queryKey: ["my-visas"],
    queryFn: getMyVisaApplications,
    enabled: signedIn
  });

  return (
    <AccountLayout title={t("account.visas")}>
      {() => (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-brand-900">
              {t("account.visas")}
            </h2>
            <Link href="/e-visa" className="btn btn-sm btn-primary">
              <Stamp className="size-4" aria-hidden="true" />
              {t("visa.newApplication")}
            </Link>
          </div>

          {isPending ? (
            <p className="surface p-10 text-center text-sm text-ink-500">
              {t("common.loading")}
            </p>
          ) : isError ? (
            <div className="surface p-10 text-center">
              <p className="text-sm text-bad-600">{t("common.error")}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="btn btn-sm btn-dark mt-4"
              >
                {t("common.retry")}
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="surface p-10 text-center">
              <Stamp
                className="mx-auto mb-3 size-8 text-ink-300"
                aria-hidden="true"
              />
              <p className="font-semibold text-brand-900">
                {t("visa.list.empty")}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {t("visa.list.emptyBody")}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.map((a) => (
                <li key={a.reference}>
                  <Link
                    href={`/account/visas/${encodeURIComponent(a.reference)}`}
                    className="surface group flex items-center gap-4 p-5 transition-shadow hover:shadow-md"
                  >
                    <span className="text-3xl leading-none" aria-hidden="true">
                      {flagOf(a.country.code)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brand-900">
                        {lz(a.visaTypeName)} · {lz(a.country.name)}
                      </p>
                      <p className="text-sm text-ink-700">
                        {a.traveller.firstName} {a.traveller.lastName}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-500">
                        <span className="font-mono text-xs" dir="ltr">
                          {a.reference}
                        </span>
                        {" · "}
                        {visaDay(a.departureDate, locale)}
                        {a.paymentStatus === "UNPAID" &&
                          a.status !== "CANCELLED" && (
                            <>
                              {" · "}
                              <Price
                                money={feeMoney(a.fee)}
                                charged={a.fee.chargedCurrency}
                              />
                            </>
                          )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <VisaBadges application={a} />
                        {a.status === "INFO_REQUESTED" && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-warn-600">
                            <Clock className="size-3.5" aria-hidden="true" />
                            {t("visa.list.actionNeeded")}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className="size-5 shrink-0 text-ink-300 group-hover:text-brand-500 rtl:-scale-x-100"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AccountLayout>
  );
}
