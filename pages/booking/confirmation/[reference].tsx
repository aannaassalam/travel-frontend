import {
  OrderDocuments,
  OrderItems,
  OrderProgress,
  OrderStatusBadges
} from "@/components/account/order";
import Layout from "@/components/site/Layout";
import RidePanel from "@/components/transfers/RidePanel";
import { ApiError, startPayment } from "@/lib/api";
import { useCheckout } from "@/lib/checkout";
import { fmtDateTime } from "@/lib/format";
import { useSiteContact } from "@/lib/contact";
import { usePrefs } from "@/lib/prefs";
import { usePolicyTitle } from "@/lib/siteContent";
import { useSession } from "@/lib/session";
import { useOrder } from "@/lib/orders";
import { Order } from "@/typescript/interface/domain.interface";
import {
  Banknote,
  CalendarPlus,
  Clock,
  CreditCard,
  KeyRound,
  MessageSquare,
  Bike,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { BookingConfirmedSpot } from "@/components/art/spots";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * §11.2 confirmation screen.
 *
 * Reads from the local order store because the reference is the customer's
 * only handle on the booking. When GET /api/v1/orders/:reference exists this
 * becomes a fetch scoped to the authenticated owner (§10.3(5): ownership is
 * enforced in the query, not checked after the fetch).
 */
export default function ConfirmationPage() {
  const policyTitle = usePolicyTitle();
  const contact = useSiteContact();
  const { t, locale } = usePrefs();
  const { signedIn, isPending: sessionPending } = useSession();
  const router = useRouter();
  const { clear } = useCheckout();

  const reference = String(router.query.reference ?? "");
  /** Read from the server, so this page shows the real order, not a local echo. */
  const {
    data: fetched,
    isPending,
    isError,
    refetch
  } = useOrder(router.isReady ? reference : undefined);
  /** "Pay now" / "pay in cash instead" on an online order that is not paid yet. */
  const [paying, setPaying] = useState<"ONLINE" | "CASH" | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  /** The server answered "being confirmed" to a press of Pay now. */
  const [awaited, setAwaited] = useState(false);
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
  /**
   * An online order is "confirmed" once it is paid, and only the server says
   * when that is. Until then it is a booking that has been registered — said
   * as plainly as for a cash one — with where its payment stands just below.
   */
  const paid = order.paymentStatus === "PAID";
  const unsettled = !isCash && !paid && order.status !== "CANCELLED";
  // Back from MaxiCash's page with its word awaited: nothing to do but wait.
  // Otherwise the customer never finished there (or was declined) and can
  // still pay — online again, or in cash.
  const confirming = unsettled && (order.paymentAwaited === true || awaited);
  const registered = isCash || !paid;
  // A ride has a driver on the way, not documents to issue.
  const isRide = order.items.some((i) => i.ride);

  async function settle(how: "ONLINE" | "CASH") {
    setPayError(null);
    setPaying(how);
    try {
      const result = await startPayment(order!.reference, how, locale);
      if (result.status === "REDIRECT") {
        // Full navigation: this leaves our origin for MaxiCash's page.
        window.location.assign(result.paymentUrl);
        return;
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "PAYMENT_BEING_CONFIRMED") setAwaited(true);
      // Being confirmed, or just cancelled: the order read again says which.
      if (code !== "PAYMENT_BEING_CONFIRMED" && code !== "ORDER_CANCELLED") {
        setPayError(
          code === "PROVIDER_ERROR"
            ? t("pay.errProvider")
            : code === "PROVIDER_UNREACHABLE"
              ? t("pay.errUnreachable")
              : code === "CASH_ONLY" || code === "PAYMENT_UNAVAILABLE"
                ? t("pay.errUnavailable")
                : t("pay.errGeneric")
        );
      }
    }
    await refetch();
    setPaying(null);
  }

  return (
    <Layout
      title={registered ? t("confirm.titleCash") : t("confirm.title")}
      description=""
      noindex
    >
      <div className="container-site max-w-3xl py-10">
        <div className="rounded-card bg-ok-100 p-6 ring-1 ring-ok-600/20 ring-inset text-center">
          <BookingConfirmedSpot className="mx-auto mb-2 w-full max-w-[200px] text-brand-900" />
          <h1 className="display text-2xl text-brand-900">
            {registered ? t("confirm.titleCash") : t("confirm.title")}
          </h1>
          <p className="mt-2 text-[15px] text-ink-700">
            {/* §10.7: the number is masked even back to its owner — the last
                three digits are enough to confirm we used the right one. */}
            {/* An online order gets its SMS when it is paid, not before. */}
            {t(unsettled ? "confirm.bodyOnlineWaiting" : "confirm.body", {
              phone: phone ?? "—"
            })}
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
        {/* Not for a meal whose online payment is still open: "on its way" is
            said once it is paid for, or to be paid to the driver. */}
        {order.delivery && !unsettled && (
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

        {/* An online order that is not paid yet: where its payment stands, and
            — when the customer never finished on MaxiCash's page — the two
            ways on from here. Never "paid" before the server says so. */}
        {unsettled && (
          <div className="mt-6 rounded-card bg-warn-100 p-6 ring-2 ring-warn-600/30 ring-inset">
            <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
              {confirming ? (
                <Clock className="size-5 text-warn-600" />
              ) : (
                <CreditCard className="size-5 text-warn-600" />
              )}
              {t(confirming ? "confirm.onlinePendingTitle" : "confirm.onlineUnpaidTitle")}
            </h2>
            <p className="mt-2 text-[15px] text-ink-900">
              {confirming
                ? t("payReturn.confirmingBody")
                : t("confirm.onlineUnpaidBody", {
                    deadline: order.cashDeadline ? fmtDateTime(order.cashDeadline, locale) : "—"
                  })}
            </p>
            {payError && (
              <p role="alert" className="mt-3 text-sm font-semibold text-bad-600">
                {payError}
              </p>
            )}
            {/* Not while a payment is being confirmed: paying again, or
                switching to cash, would ask for money that may already have
                been taken. */}
            {!confirming && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={paying !== null}
                  onClick={() => void settle("ONLINE")}
                  className="btn btn-md btn-primary"
                >
                  {paying === "ONLINE" ? t("checkout.waitingOnline") : t("confirm.payNow")}
                </button>
                <button
                  type="button"
                  disabled={paying !== null}
                  onClick={() => void settle("CASH")}
                  className="btn btn-md btn-outline"
                >
                  {t("payReturn.payCash")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Nor for a ride: its cash goes to the driver at the end of it, which
            the ride block below says in place of any office deadline. */}
        {isCash && !order.delivery && !isRide && order.cashDeadline && (
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

        {/* A transfer: where the ride stands, the map, the driver once named. */}
        <RidePanel order={order} className="mt-6" />

        <div className="mt-6 surface p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-brand-900">{t("checkout.summary")}</h2>
            <OrderStatusBadges order={order} />
          </div>
          {/* Its total says what was charged, the francs beside it. */}
          <OrderItems order={order} />
        </div>

        <div className="mt-6 surface p-6">
          <h2 className="mb-4 text-lg font-bold text-brand-900">{t("steps.title")}</h2>
          <OrderProgress order={order} />
        </div>

        <div className="mt-6 surface p-6">
          <h2 className="mb-3 text-lg font-bold text-brand-900">{t("confirm.next")}</h2>
          <ul className="space-y-3 text-[15px] text-ink-700">
            {/* Sent when a cash booking is filed and when an online one is
                paid — not for an online booking still waiting on its payment. */}
            {!unsettled && (
              <li className="flex gap-3">
                <MessageSquare className="mt-0.5 size-5 shrink-0 text-brand-500" />
                {locale === "fr"
                  ? "Une confirmation vous a été envoyée avec la référence et les conditions."
                  : "A confirmation with the reference and conditions has been sent."}
              </li>
            )}
            {!isRide && (
              <li className="flex gap-3">
                <CalendarPlus className="mt-0.5 size-5 shrink-0 text-brand-500" />
                {locale === "fr"
                  ? "Vos documents de voyage sont émis sous 24 heures ouvrées et apparaissent dans votre compte."
                  : "Your travel documents are issued within 24 working hours and appear in your account."}
              </li>
            )}
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

        {/*
          §2.1 step 3: the one-tap claim link, restated on screen — for GUESTS.

          It rendered for everyone, so a signed-in customer was invited to "set a
          password" they already had, and the button opened the sign-in tab
          rather than sign-up, which is useless to a guest with no password.
          Hidden while the session is still loading too: a wrong upsell flashing
          at a signed-in customer is worse than a guest seeing it a beat later.
          `next` brings them straight back to this booking once signed up.
        */}
        {!sessionPending && !signedIn && (
          <div className="mt-6 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset">
            <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
              <KeyRound className="size-5 text-brand-500" />
              {t("confirm.claimTitle")}
            </h2>
            <p className="mt-1 text-[15px] text-ink-700">{t("confirm.claimBody")}</p>
            <Link
              href={`/login?mode=signup&next=${encodeURIComponent(
                `/booking/confirmation/${order.reference}`
              )}`}
              className="btn btn-sm btn-outline mt-3"
            >
              {t("confirm.claimCta")}
            </Link>
          </div>
        )}

        {/* §2.2(4): the policy is repeated in the confirmation, in the
            customer's locale, exactly as it was accepted. */}
        {order.consent && (
          <div className="mt-6 rounded-card bg-ink-50 p-6 ring-1 ring-ink-100 ring-inset">
            <h2 className="flex items-center gap-2 text-base font-bold text-brand-900">
              <ShieldCheck className="size-5 text-brand-500" />
              {policyTitle}
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
