import AccountLayout from "@/components/account/AccountLayout";
import {
  OrderDocuments,
  OrderItems,
  OrderStatusBadges,
  StatusTimeline
} from "@/components/account/order";
import { SettlementNote } from "@/components/site/bits";
import { fmtDateTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { useOrder } from "@/lib/orders";
import { Order } from "@/typescript/interface/domain.interface";
import { Banknote, Headphones, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

/** §11.2 booking detail — status timeline, documents, support. No cancel button. */
export default function BookingDetail() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  /** Server-owned: cash received, documents issued and cancellations all
      originate in the admin, so this must never render a local copy. */
  const { data, isPending, isError } = useOrder(
    router.isReady ? String(router.query.reference) : undefined
  );
  const order: Order | null | undefined = isPending ? undefined : isError ? null : data;

  return (
    <AccountLayout title={t("account.viewBooking")}>
      {() =>
        order === undefined ? (
          <p className="text-ink-500">{t("common.loading")}…</p>
        ) : !order ? (
          <div className="surface p-10 text-center">
            <p className="font-semibold text-brand-900">{t("common.notFound")}</p>
            <p className="mt-1 text-sm text-ink-500">{t("common.notFoundBody")}</p>
            <Link
              href="/account/bookings"
              className="mt-4 inline-flex rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold text-brand-900"
            >
              {t("account.bookings")}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-brand-900">
                    {order.items[0]?.listingLabel}
                  </h2>
                  <p className="mt-1 font-mono text-sm text-ink-500">{order.reference}</p>
                </div>
                <OrderStatusBadges order={order} />
              </div>

              <div className="mt-4 border-t border-ink-100/70 pt-4">
                <OrderItems order={order} />
                <SettlementNote money={order.total} />
              </div>
            </div>

            {order.paymentMethod === "CASH" && order.cashDeadline && (
              <div className="rounded-card bg-warn-100 p-6 ring-2 ring-warn-600/30 ring-inset">
                <h3 className="flex items-center gap-2 font-bold text-brand-900">
                  <Banknote className="size-5 text-warn-600" />
                  {locale === "fr" ? "Paiement en agence" : "Cash payment"}
                </h3>
                <p className="mt-2 text-[15px] text-ink-900">
                  {t("confirm.cashBody", {
                    ref: order.reference,
                    deadline: fmtDateTime(order.cashDeadline, locale)
                  })}
                </p>
              </div>
            )}

            {order.travellers.length > 0 && (
              <div className="surface p-6">
                <h3 className="mb-3 font-bold text-brand-900">{t("account.travellers")}</h3>
                <ul className="space-y-2 text-[15px] text-ink-700">
                  {order.travellers.map((tr, i) => (
                    <li key={i}>
                      {tr.firstName} {tr.lastName}
                      {/* §10.5: masked by default. The full number never leaves
                          the server, and nothing on this page needs it. */}
                      {tr.documentNumberMasked && (
                        <span className="ml-2 text-sm text-ink-500">
                          {tr.documentType} ••••{tr.documentNumberMasked.slice(-3)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="surface p-6">
                <h3 className="mb-4 font-bold text-brand-900">{t("account.timeline")}</h3>
                <StatusTimeline order={order} />
              </div>
              <div className="surface p-6">
                <h3 className="mb-4 font-bold text-brand-900">{t("account.documents")}</h3>
                <OrderDocuments order={order} />
              </div>
            </div>

            {order.consent && (
              <div className="rounded-card bg-ink-50 p-6 ring-1 ring-ink-100 ring-inset">
                <h3 className="flex items-center gap-2 font-bold text-brand-900">
                  <ShieldCheck className="size-5 text-brand-500" />
                  {t("policy.title")}
                </h3>
                <p className="mt-2 text-sm text-ink-900">« {order.consent.textShown} »</p>
                <p className="mt-2 text-xs text-ink-500">
                  {locale === "fr" ? "Accepté le" : "Accepted on"}{" "}
                  {fmtDateTime(order.consent.acceptedAt, locale)} ·{" "}
                  {order.consent.policyVersionLabel}
                </p>
              </div>
            )}

            {/* §4.4: "Contact support", never a self-service cancel button. */}
            <div className="surface p-6">
              <h3 className="flex items-center gap-2 font-bold text-brand-900">
                <Headphones className="size-5 text-brand-500" />
                {t("account.support")}
              </h3>
              <p className="mt-2 text-sm text-ink-700">{t("account.cancelNote")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="tel:+243810000000"
                  className="rounded-md bg-brand-900 px-4 py-2.5 text-sm font-bold text-white"
                >
                  +243 81 000 00 00
                </a>
                <a
                  href={`https://wa.me/243810000000?text=${encodeURIComponent(order.reference)}`}
                  className="rounded-md border border-brand-500 px-4 py-2.5 text-sm font-bold text-brand-500 hover:bg-brand-50"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        )
      }
    </AccountLayout>
  );
}
