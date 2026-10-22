import {
  ConsentBox,
  HoldBanner,
  Stepper,
  Summary,
  useNoRefundPolicy
} from "@/components/checkout/parts";
import PaymentChoice from "@/components/checkout/PaymentChoice";
import Layout from "@/components/site/Layout";
import { ApiError, startPayment } from "@/lib/api";
import { useCheckout } from "@/lib/checkout";
import { useOnlinePayment } from "@/lib/payments";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/** §11.3 step 3 of 3 — payment, consent, and nothing revealed for the first time. */
export default function PaymentStep() {
  const { t, locale, currency } = usePrefs();
  const router = useRouter();
  const {
    ready,
    selection,
    contact,
    consentAccepted,
    consentFor,
    paymentMethod,
    update,
    confirm,
    expired,
    clear,
    retryAttempt
  } = useCheckout();

  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{ consent?: boolean; terms?: boolean }>({});
  const policy = useNoRefundPolicy();
  // What the server offers now decides, not what was chosen earlier: a choice
  // of "online" kept from before it was switched off is a cash booking.
  const online = useOnlinePayment(currency);
  const method = online.available && paymentMethod === "ONLINE" ? "ONLINE" : "CASH";
  // A tick counts for the sentence it was made under and no other: not while
  // the text is still loading, not after the language (so the version) changed,
  // and not when it comes back from an earlier visit to this page.
  const agreed = Boolean(consentAccepted && policy.shown && consentFor === policy.shown);
  /** §2.2: both acknowledgements are blocking, and neither is pre-ticked. */
  const blocked = !agreed || !terms;
  // §11.6: never leave someone staring at a spinner that has given up — this
  // state says what is happening while the booking is filed.
  const [waiting, setWaiting] = useState(false);
  /** Server-side checkout failures — a sold-out race is the common one. */
  const [error, setError] = useState<string | null>(null);
  /** Set when the order can no longer be paid, so "try again" is not offered. */
  const [dead, setDead] = useState(false);
  /** The server's own reason code, for picking the right guidance below. */
  const [code, setCode] = useState<string | undefined>();

  useEffect(() => {
    if (ready && (!selection || !contact)) router.replace("/");
  }, [ready, selection, contact, router]);

  if (!ready || !selection || !contact) return null;

  /**
   * Creates the order, then settles how it is paid.
   *
   * The order is created FIRST, always: the server takes the inventory hold at
   * creation, so a payment can only ever be for stock that is already
   * reserved. Cash has nothing to redirect to — the confirmation screen
   * carries the instructions for paying at the office. Online leaves this site
   * for MaxiCash's page, and the customer comes back to
   * /booking/payment/return/….
   */
  async function finish() {
    setError(null);
    let reference: string | undefined;
    try {
      const order = await confirm({
        currency,
        locale,
        policyVersionId: policy.versionId,
        paymentMethod: method
      });
      reference = order.reference;
      const result = await startPayment(order.reference, method, locale);
      if (result.status === "REDIRECT") {
        // Full navigation, not router.push: this leaves our origin entirely.
        window.location.assign(result.paymentUrl);
        return;
      }
      router.push(`/booking/confirmation/${order.reference}`);
    } catch (err) {
      setWaiting(false);
      // A sold-out race is the expected failure and needs to say so plainly —
      // §11.6: never leave someone staring at a spinner that has given up.
      /**
       * The server's `code` is the contract; its English message is operational
       * detail, not customer copy. Showing it raw put "The payment provider
       * refused the request" in the middle of a French checkout.
       */
      const status = err instanceof ApiError ? err.status : 0;
      const code = err instanceof ApiError ? err.code : undefined;
      // The customer has already come back from MaxiCash's page on this
      // booking and its confirmation is on its way: that page says so, and
      // there is nothing to pay again.
      if (code === "PAYMENT_BEING_CONFIRMED" && reference) {
        router.push(`/booking/confirmation/${reference}`);
        return;
      }
      setCode(code);
      setDead(code === "ORDER_CANCELLED" || code === "CURRENCY_CHANGED");
      // The office published a new no-refund text while this page was open:
      // show it, and the tick made under the old one no longer counts.
      if (code === "POLICY_CHANGED") {
        update({ consentAccepted: false, consentFor: undefined });
        policy.replace((err as ApiError).body?.policy);
      }
      const byCode: Record<string, string> = {
        /**
         * The hold ran out and the server released the seats, so this order can
         * never be paid. Retrying is pointless — the message says so and the
         * banner below offers the only route that works.
         */
        ORDER_CANCELLED: t("pay.errCancelled"),
        CURRENCY_CHANGED: t("pay.errCurrency"),
        /** A guest typed a number that belongs to an account: sign in first. */
        ACCOUNT_EXISTS: t("pay.errAccountExists"),
        POLICY_CHANGED: t("pay.errPolicyChanged"),
        // Online payment could not be opened. The booking exists and its seat
        // is held: cash, just above, is one press away on the same booking.
        PAYMENT_UNAVAILABLE: t("pay.errUnavailable"),
        CASH_ONLY: t("pay.errUnavailable"),
        PROVIDER_ERROR: t("pay.errProvider"),
        PROVIDER_UNREACHABLE: t("pay.errUnreachable"),
        CURRENCY_UNSUPPORTED: t("pay.errOnlineCurrency"),
        AMOUNT_BELOW_MINIMUM: t("pay.errTooSmall"),
        // A bus or flight line the server would not price as chosen.
        DEPARTURE_UNAVAILABLE: t("route.errDeparture"),
        INVALID_PASSENGERS: t("route.errPassengers"),
        BAGGAGE_REQUIRED: t("route.errBaggage"),
        PAYMENT_BEING_CONFIRMED: t("payReturn.confirmingTitle"),
        RAIL_INVALID: t("pay.errGeneric")
      };
      setError(
        (code && byCode[code]) ||
          (status === 409 ? t("pay.errSoldOut") : t("pay.errGeneric"))
      );
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = { consent: !agreed, terms: !terms };
    setErrors(next);
    if (next.consent || next.terms) return;
    setWaiting(true);
    void finish();
  }

  // A failure while waiting drops back to the form, where the message lives —
  // a spinner that silently stops is the worst of both.
  if (waiting && !error) {
    return (
      <Layout
        title={t(method === "ONLINE" ? "checkout.waitingOnline" : "checkout.waitingCash")}
        description=""
        noindex
      >
        <div className="container-site flex min-h-[60vh] items-center justify-center py-12">
          <div className="max-w-md surface p-8 text-center">
            <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-500" />
            <h1 className="text-xl font-bold text-brand-900">
              {t(method === "ONLINE" ? "checkout.waitingOnline" : "checkout.waitingCash")}
            </h1>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("checkout.step3")} description={t("checkout.step3")} noindex>
      <div className="container-site py-8">
        <Stepper current={3} />
        <HoldBanner />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submit} noValidate className="space-y-6">
            <fieldset className="surface p-6">
              <legend className="px-1 text-xl font-bold text-brand-900">
                {t("checkout.payWith")}
              </legend>
              <PaymentChoice
                value={method}
                onChange={(next) => {
                  update({ paymentMethod: next });
                  setError(null);
                }}
                online={online}
                cashLabel={t("checkout.cash")}
                cashNote={t("checkout.cashNote")}
              />
            </fieldset>

            {/* §2.2(1): separate, unticked, blocking. Never bundled with T&Cs. */}
            <ConsentBox
              policy={policy}
              checked={agreed}
              error={errors.consent}
              onChange={(v) => {
                update({ consentAccepted: v, consentFor: v ? policy.shown : undefined });
                setErrors((e) => ({ ...e, consent: false }));
              }}
            />

            <div
              className={cn(
                "rounded-lg border bg-white p-4",
                errors.terms ? "border-bad-600" : "border-ink-100"
              )}
            >
              <label className="flex cursor-pointer gap-3 text-sm text-ink-900">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => {
                    setTerms(e.target.checked);
                    setErrors((x) => ({ ...x, terms: false }));
                  }}
                  className="mt-0.5 size-4 shrink-0 accent-brand-900"
                />
                <span>
                  {t("checkout.terms")}{" "}
                  <Link href="/terms" className="text-brand-500 underline">
                    {t("footer.terms")}
                  </Link>
                  {" · "}
                  <Link href="/privacy" className="text-brand-500 underline">
                    {t("footer.privacy")}
                  </Link>
                </span>
              </label>
              {errors.terms && (
                <p role="alert" className="mt-2 pl-7 text-sm font-semibold text-bad-600">
                  {t("err.required")}
                </p>
              )}
            </div>

            {/*
              The failure message. It was being set and never rendered: a
              declined payment stopped the spinner, put the form back, and said
              nothing at all — which reads as a dead button rather than a
              refusal. Anything the server could not complete has to say so here.
            */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl bg-bad-100 px-5 py-4 text-sm ring-1 ring-bad-600/20 ring-inset"
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-bad-600" />
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{error}</p>
                  <p className="mt-1 text-ink-700">
                    {dead
                      ? t("pay.errCancelledBody")
                      : code === "ACCOUNT_EXISTS"
                        ? t("pay.errAccountExistsBody")
                        : online.available
                          ? t("pay.errNoCharge")
                          : t("pay.errNoChargeCash")}
                  </p>
                  {code === "ACCOUNT_EXISTS" && (
                    <div className="mt-3">
                      {/* Checkout lives in sessionStorage, so it is still here
                          when sign-in sends the customer back to this page. */}
                      <Link
                        href={`/login?next=${encodeURIComponent(router.asPath)}`}
                        className="btn btn-sm btn-dark"
                      >
                        {t("nav.signin")}
                      </Link>
                    </div>
                  )}
                  {dead && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {/*
                        Keeps the basket. The seats went back to the pool when
                        the hold lapsed, so a fresh order can legitimately take
                        them again — making someone re-pick their flight because
                        our provider was slow is a self-inflicted lost sale.
                      */}
                      <button
                        type="button"
                        onClick={() => {
                          retryAttempt();
                          setError(null);
                          setDead(false);
                        }}
                        className="btn btn-sm btn-dark"
                      >
                        {t("pay.retry")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clear();
                          router.push("/");
                        }}
                        className="btn btn-sm btn-outline"
                      >
                        {t("checkout.holdRestart")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/booking/contact")}
                className="btn btn-md btn-outline"
              >
                {t("checkout.back")}
              </button>
              {/*
                Two different kinds of "you cannot press this".

                The hold expiring is not recoverable on this screen, so that is
                a real `disabled`. Unticked boxes ARE recoverable, so the button
                is only styled and announced as unavailable - it stays focusable
                and clickable, because a truly disabled button is skipped by
                screen readers and tells a keyboard user nothing about what is
                missing. Pressing it still marks the box that needs ticking.
              */}
              <div className="flex flex-col items-end gap-2">
                <button
                  type="submit"
                  disabled={expired || dead}
                  aria-disabled={blocked || undefined}
                  aria-describedby={blocked ? "consent-required" : undefined}
                  className={cn(
                    "btn btn-lg",
                    /*
                      Blocked is not disabled (see above), so it cannot use the
                      system's disabled styling — it stays pressable and only
                      LOOKS unavailable. Everything else comes from `btn`, so
                      the most important button on the site finally has the same
                      press feedback and reduced-motion handling as the rest.
                    */
                    blocked
                      ? "cursor-not-allowed bg-accent-500/40 text-brand-900"
                      : "btn-primary"
                  )}
                >
                  {t(method === "ONLINE" ? "checkout.payOnlineCta" : "checkout.reserveCash")}
                </button>
                {blocked && (
                  <p id="consent-required" className="text-sm text-ink-500">
                    {locale === "fr"
                      ? "Cochez les deux cases pour continuer."
                      : "Tick both boxes to continue."}
                  </p>
                )}
              </div>
            </div>
          </form>

          <Summary />
        </div>
      </div>
    </Layout>
  );
}
