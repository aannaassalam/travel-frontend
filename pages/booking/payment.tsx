import { ConsentBox, HoldBanner, Stepper, Summary } from "@/components/checkout/parts";
import Layout from "@/components/site/Layout";
import { ApiError, startPayment } from "@/lib/api";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { useCheckout } from "@/lib/checkout";
import { maskPhone } from "@/lib/format";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { ONLINE_RAILS, PaymentRail } from "@/typescript/interface/domain.interface";
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  Smartphone,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const OPERATORS = ["M-Pesa", "Orange Money", "Airtel Money", "Afrimoney"];

/** §11.3 step 3 of 3 — payment, consent, and nothing revealed for the first time. */
export default function PaymentStep() {
  const { t, locale, currency } = usePrefs();
  const router = useRouter();
  const {
    ready,
    selection,
    contact,
    total,
    paymentRail,
    mobileOperator,
    consentAccepted,
    update,
    confirm,
    expired,
    clear,
    retryAttempt
  } = useCheckout();

  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{ consent?: boolean; terms?: boolean }>({});
  /** §2.2: both acknowledgements are blocking, and neither is pre-ticked. */
  const blocked = !consentAccepted || !terms;
  // §9.3: mobile money is push-and-wait. A bare spinner here is the single
  // largest drop-off point in African mobile-money checkouts, so this state
  // says what is happening and what the customer must do.
  const [waiting, setWaiting] = useState(false);
  /** Server-side checkout failures — a sold-out race is the common one. */
  const [error, setError] = useState<string | null>(null);
  /** Set when the order can no longer be paid, so "try again" is not offered. */
  const [dead, setDead] = useState(false);
  /** Below the provider floor — an online retry can never succeed. */
  const [tooSmall, setTooSmall] = useState(false);
  /** The provider's own reason code, for picking the right guidance below. */
  const [code, setCode] = useState<string | undefined>();

  useEffect(() => {
    if (ready && (!selection || !contact)) router.replace("/");
  }, [ready, selection, contact, router]);

  if (!ready || !selection || !contact) return null;

  const isCash = !ONLINE_RAILS.includes(paymentRail);
  const amount = price(total, currency, locale);

  function setRail(rail: PaymentRail) {
    update({
      paymentRail: rail,
      // Only the provider rails are ONLINE; the rest the office collects.
      paymentMethod: ONLINE_RAILS.includes(rail) ? "ONLINE" : "CASH"
    });
  }

  /**
   * Creates the order, then settles it.
   *
   * The order is created FIRST and paid second, in that order, always: the
   * server takes the inventory hold at creation, so a payment can only ever
   * settle stock that is already reserved. Doing it the other way round means
   * charging someone for a seat that sold while the provider was thinking.
   */
  async function finish() {
    setError(null);
    try {
      const order = await confirm({ currency, locale });

      /**
       * Cash and bank transfer are settled at the office, so there is nothing
       * to redirect to — the confirmation screen carries the instructions.
       */
      if (!ONLINE_RAILS.includes(paymentRail)) {
        await startPayment(order.reference, paymentRail, locale);
        router.push(`/booking/confirmation/${order.reference}`);
        return;
      }

      const result = await startPayment(order.reference, paymentRail, locale);
      if (result.status === "PAID") {
        router.push(`/booking/confirmation/${order.reference}`);
        return;
      }
      if (result.status === "REDIRECT") {
        /**
         * The reference has to survive the round trip to MaxiCash: the return
         * URL is fixed at initialisation and comes back without it, so the
         * screen on the other side would have nothing to ask about.
         */
        try {
          window.sessionStorage.setItem("pendingOrderRef", order.reference);
        } catch {
          /* private mode — the return screen falls back to asking. */
        }
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
      setCode(code);
      setDead(code === "ORDER_CANCELLED" || code === "CURRENCY_CHANGED");
      // Retrying the same amount cannot help; the copy points at the office.
      setTooSmall(code === "AMOUNT_BELOW_MINIMUM" || code === "AMOUNT_INVALID");
      const byCode: Record<string, string> = {
        /**
         * The hold ran out and the server released the seats, so this order can
         * never be paid. Retrying is pointless — the message says so and the
         * banner below offers the only route that works.
         */
        ORDER_CANCELLED: t("pay.errCancelled"),
        CURRENCY_CHANGED: t("pay.errCurrency"),
        AMOUNT_BELOW_MINIMUM: t("pay.errTooSmall"),
        METHOD_UNAVAILABLE: t("pay.errMethod"),
        PROVIDER_ERROR: t("pay.errProvider"),
        PROVIDER_UNREACHABLE: t("pay.errUnreachable"),
        PAYMENT_UNAVAILABLE: t("pay.errUnavailable"),
        AMOUNT_INVALID: t("pay.errAmount"),
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
    const next = { consent: !consentAccepted, terms: !terms };
    setErrors(next);
    if (next.consent || next.terms) return;
    setWaiting(true);
    void finish();
  }

  // A failure while waiting drops back to the form, where the message lives —
  // a spinner that silently stops is the worst of both.
  if (waiting && !error) {
    return (
      <Layout title={t("checkout.waitingTitle")} description="" noindex>
        <div className="container-site flex min-h-[60vh] items-center justify-center py-12">
          <div className="max-w-md surface p-8 text-center">
            <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-500" />
            <h1 className="text-xl font-bold text-brand-900">
              {t("checkout.waitingTitle")}
            </h1>
            <p className="mt-2 text-[15px] text-ink-700">
              {t("checkout.waitingBody", {
                amount,
                phone: maskPhone(contact.phone)
              })}
            </p>
            <p className="mt-4 text-sm text-ink-500">
              {locale === "fr"
                ? `Composez le code ${mobileOperator} si aucune notification n'arrive dans les 60 secondes.`
                : `Dial the ${mobileOperator} code if no prompt arrives within 60 seconds.`}
            </p>
            <button
              type="button"
              onClick={() => setWaiting(false)}
              className="mt-6 text-sm font-semibold text-brand-500 underline"
            >
              {t("checkout.waitingCancel")}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const rails: { id: PaymentRail; Icon: typeof Smartphone; label: string; note: string }[] = [
    {
      id: "MOBILE_MONEY",
      Icon: Smartphone,
      label: t("checkout.mobileMoney"),
      note: t("checkout.mobileMoneyNote")
    },
    { id: "CARD", Icon: CreditCard, label: t("checkout.card"), note: t("checkout.cardNote") },
    { id: "WALLET", Icon: Wallet, label: t("checkout.wallet"), note: t("checkout.walletNote") },
    {
      id: "BANK_TRANSFER",
      Icon: Landmark,
      label: t("checkout.bankTransfer"),
      note: t("checkout.bankTransferNote")
    },
    { id: "CASH", Icon: Banknote, label: t("checkout.cash"), note: t("checkout.cashNote") }
  ];

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
              <div className="mt-3 space-y-3">
                {rails.map(({ id, Icon, label, note }) => (
                  <label
                    key={id}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-4",
                      paymentRail === id
                        ? "border-brand-500 bg-brand-50"
                        : "border-ink-100 hover:bg-ink-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="rail"
                      checked={paymentRail === id}
                      onChange={() => setRail(id)}
                      className="mt-1 size-4 accent-brand-500"
                    />
                    <Icon className="mt-0.5 size-5 shrink-0 text-brand-500" />
                    <span className="min-w-0">
                      <span className="block font-bold text-ink-900">{label}</span>
                      <span className="block text-sm text-ink-500">{note}</span>

                      {id === "MOBILE_MONEY" && paymentRail === "MOBILE_MONEY" && (
                        <span className="mt-3 block">
                          <span className="mb-1 block text-sm font-semibold text-ink-700">
                            {t("checkout.operator")}
                          </span>
                          <InlineSelect
                            ariaLabel={t("checkout.operator")}
                            value={mobileOperator}
                            onValueChange={(v) => update({ mobileOperator: v })}
                            options={OPERATORS.map((o) => ({ value: o, label: o }))}
                            triggerClassName="w-full max-w-xs justify-between rounded-xl px-4 py-3 text-base shadow-xs"
                          />
                          <span className="mt-2 block text-xs text-ink-500">
                            {locale === "fr"
                              ? `La demande sera envoyée au ${maskPhone(contact.phone)}.`
                              : `The request will be sent to ${maskPhone(contact.phone)}.`}
                          </span>
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              {/* §9.3: PCI scope stays at SAQ-A — we never see a card number. */}
              <p className="mt-4 flex items-start gap-2 text-xs text-ink-500">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                {locale === "fr"
                  ? "Les paiements par carte se font sur la page sécurisée de notre prestataire. Nous n'enregistrons aucune donnée de carte."
                  : "Card payments happen on our provider's secure page. We store no card data."}
              </p>
            </fieldset>

            {/* §2.2(1): separate, unticked, blocking. Never bundled with T&Cs. */}
            <ConsentBox
              checked={consentAccepted}
              error={errors.consent}
              onChange={(v) => {
                update({ consentAccepted: v });
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
                      : code === "METHOD_UNAVAILABLE"
                        ? t("pay.errMethodBody")
                        : tooSmall
                          ? t("pay.errTooSmallBody")
                          : t("pay.errNoCharge")}
                  </p>
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
                  {isCash ? t("checkout.reserveCash") : t("checkout.payNow", { amount })}
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
