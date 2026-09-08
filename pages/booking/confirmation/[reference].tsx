import { OrderDocuments, OrderItems, OrderStatusBadges } from "@/components/account/order";
import { SettlementNote } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { useCheckout } from "@/lib/checkout";
import { fmtDateTime } from "@/lib/format";
import { useSiteContact } from "@/lib/contact";
import { usePrefs } from "@/lib/prefs";
import { useOrder } from "@/lib/orders";
import { Order } from "@/typescript/interface/domain.interface";
import {
  Banknote,
  CalendarPlus,
  KeyRound,
  MessageSquare,
  Bike,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { BookingConfirmedSpot } from "@/components/art/spots";
import { useRouter } from "next/router";
import { useEffect } from "react";

/**
 * §11.2 confirmation screen.
 *
 * Reads from the local order store because the reference is the customer's
 * only handle on the booking. When GET /api/v1/orders/:reference exists this
 * becomes a fetch scoped to the authenticated owner (§10.3(5): ownership is
 * enforced in the query, not checked after the fetch).
 */
export default function ConfirmationPage() {
  const contact = useSiteContact();
  const { t, locale } = usePrefs();
  const router = useRouter();
  const { clear } = useCheckout();

  const reference = String(router.query.reference ?? "");
  /** Read from the server, so this page shows the real order, not a local echo. */
  const { data: fetched, isPending, isError } = useOrder(router.isReady ? reference : undefined);
  const order: Order | null | undefined = isPending ? undefined : isError ? null : fetched;

  // From the order itself — the number the customer actually booked with,
  // signed in or not. Already masked by the API; the full one never leaves it.
  const phone = order?.contactPhoneMasked ?? null;

  useEffect(() => {
    if (!router.isReady) return;
    // The order exists on the server now; nothing should still be in checkout.
    clear();
  }, [router.isReady, clear]);

  if (order === undefined) {
    return (
      <Layout title={t("common.loading")} description="" noindex>
        <div className="container-site py-20 text-center text-ink-500">
          {t("common.loading")}…
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout title={t("common.notFound")} description="" noindex>
        <div className="container-site py-20 text-center">
          <h1 className="display text-2xl text-brand-900">{t("common.notFound")}</h1>
          <p className="mt-2 text-ink-500">{t("common.notFoundBody")}</p>
          <Link
            href="/"
            className="btn btn-lg btn-primary mt-6"
          >
            {t("common.backHome")}
          </Link>
        </div>
      </Layout>
    );
  }

  const isCash = order.paymentMethod === "CASH";

  return (
    <Layout
      title={isCash ? t("confirm.titleCash") : t("confirm.title")}
      description=""
      noindex
    >
      <div className="container-site max-w-3xl py-10">
        <div className="rounded-card bg-ok-100 p-6 ring-1 ring-ok-600/20 ring-inset text-center">
          <BookingConfirmedSpot className="mx-auto mb-2 w-full max-w-[200px] text-brand-900" />
          <h1 className="display text-2xl text-brand-900">
            {isCash ? t("confirm.titleCash") : t("confirm.title")}
          </h1>
          <p className="mt-2 text-[15px] text-ink-700">
            {/* §10.7: the number is masked even back to its owner — the last
                three digits are enough to confirm we used the right one. */}
            {t("confirm.body", { phone: phone ?? "—" })}
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-ink-500">
            {t("confirm.reference")}
          </p>
          <p className="font-mono text-2xl font-bold tracking-wider text-brand-900">
            {order.reference}
          </p>
        </div>

        {/* §9.4: cash instructions are the whole point of the screen for a cash
            order — deadline first, in bold, not buried under a voucher link. */}
        {/* A delivery order is not collected from a counter. Showing the
            office address and a "bring the reference in" deadline to someone
            waiting for a driver is the wrong instruction on the one screen
            that exists to give the right one. */}
        {order.delivery && (
          <div className="mt-6 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset">
            <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
              <Bike className="size-5 text-brand-500" />
              {locale === "fr" ? "Livraison en cours" : "On its way"}
            </h2>
            <p className="mt-2 text-[15px] text-ink-900">{order.delivery.address}</p>
            {order.delivery.notes && (
              <p className="mt-1 text-sm text-ink-700">{order.delivery.notes}</p>
            )}
            <p className="mt-3 text-sm text-ink-700">
              {order.delivery.zoneName}
              {order.delivery.etaMinutes
                ? ` · ${locale === "fr" ? "environ" : "about"} ${order.delivery.etaMinutes} min`
                : ""}
            </p>
            {isCash && (
              <p className="mt-3 text-sm font-semibold text-ink-900">
                {locale === "fr"
                  ? "Payez le livreur en espèces à la réception de la commande."
                  : "Pay the driver in cash when the food arrives."}
              </p>
            )}
          </div>
        )}

        {isCash && !order.delivery && order.cashDeadline && (
          <div className="mt-6 rounded-card bg-warn-100 p-6 ring-2 ring-warn-600/30 ring-inset">
            <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
              <Banknote className="size-5 text-warn-600" />
              {locale === "fr" ? "Payer en agence" : "Pay at our office"}
            </h2>
            <p className="mt-2 text-[15px] text-ink-900">
              {t("confirm.cashBody", {
                ref: order.reference,
                deadline: fmtDateTime(order.cashDeadline, locale)
              })}
            </p>
            <p className="mt-3 text-sm text-ink-700">
              {[contact.streetAddress, contact.city].filter(Boolean).join(", ")} ·{" "}
              {contact.officeHours || t("home.trustHours")}
            </p>
          </div>
        )}

        <div className="mt-6 surface p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-brand-900">{t("checkout.summary")}</h2>
            <OrderStatusBadges order={order} />
          </div>
          <OrderItems order={order} />
          <div className="mt-2">
            <SettlementNote money={order.total} />
          </div>
        </div>

        <div className="mt-6 surface p-6">
          <h2 className="mb-3 text-lg font-bold text-brand-900">{t("confirm.next")}</h2>
          <ul className="space-y-3 text-[15px] text-ink-700">
            <li className="flex gap-3">
              <MessageSquare className="mt-0.5 size-5 shrink-0 text-brand-500" />
              {locale === "fr"
                ? "Un SMS de confirmation vous a été envoyé avec la référence et les conditions."
                : "A confirmation SMS with the reference and conditions has been sent."}
            </li>
            <li className="flex gap-3">
              <CalendarPlus className="mt-0.5 size-5 shrink-0 text-brand-500" />
              {locale === "fr"
                ? "Vos documents de voyage sont émis sous 24 heures ouvrées et apparaissent dans votre compte."
                : "Your travel documents are issued within 24 working hours and appear in your account."}
            </li>
          </ul>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-bold text-brand-900">
              {t("account.documents")}
            </h3>
            <OrderDocuments order={order} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/account/bookings/${order.reference}`}
              className="btn btn-lg btn-primary"
            >
              {t("confirm.viewBooking")}
            </Link>
            <Link
              href="/"
              className="btn btn-md btn-outline"
            >
              {t("common.backHome")}
            </Link>
          </div>
        </div>

        {/* §2.1 step 3: the one-tap claim link, restated on screen. */}
        <div className="mt-6 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset">
          <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
            <KeyRound className="size-5 text-brand-500" />
            {t("confirm.claimTitle")}
          </h2>
          <p className="mt-1 text-[15px] text-ink-700">{t("confirm.claimBody")}</p>
          <Link
            href="/login"
            className="btn btn-sm btn-outline mt-3"
          >
            {t("confirm.claimCta")}
          </Link>
        </div>

        {/* §2.2(4): the policy is repeated in the confirmation, in the
            customer's locale, exactly as it was accepted. */}
        {order.consent && (
          <div className="mt-6 rounded-card bg-ink-50 p-6 ring-1 ring-ink-100 ring-inset">
            <h2 className="flex items-center gap-2 text-base font-bold text-brand-900">
              <ShieldCheck className="size-5 text-brand-500" />
              {t("policy.title")}
            </h2>
            <p className="mt-2 text-sm text-ink-900">« {order.consent.textShown} »</p>
            <p className="mt-2 text-xs text-ink-500">
              {locale === "fr" ? "Accepté le" : "Accepted on"}{" "}
              {fmtDateTime(order.consent.acceptedAt, locale)} ·{" "}
              {order.consent.policyVersionLabel}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
