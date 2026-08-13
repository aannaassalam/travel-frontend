import { ConsentBox, HoldBanner, Stepper, Summary } from "@/components/checkout/parts";
import Layout from "@/components/site/Layout";
import { ApiError, payOrder } from "@/lib/api";
import { useCheckout } from "@/lib/checkout";
import { maskPhone } from "@/lib/format";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PaymentRail } from "@/typescript/interface/domain.interface";
import { Banknote, CreditCard, Loader2, Lock, Smartphone } from "lucide-react";
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
    expired
  } = useCheckout();

  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{ consent?: boolean; terms?: boolean }>({});
  // §9.3: mobile money is push-and-wait. A bare spinner here is the single
  // largest drop-off point in African mobile-money checkouts, so this state
  // says what is happening and what the customer must do.
  const [waiting, setWaiting] = useState(false);
  /** Server-side checkout failures — a sold-out race is the common one. */
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && (!selection || !contact)) router.replace("/");
  }, [ready, selection, contact, router]);

  if (!ready || !selection || !contact) return null;

  const isCash = paymentRail === "CASH";
  const amount = price(total, currency, locale);

  function setRail(rail: PaymentRail) {
    update({ paymentRail: rail, paymentMethod: rail === "CASH" ? "CASH" : "ONLINE" });
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
      if (order.paymentMethod !== "CASH") {
        // ponytail: stands in for the provider. `payOrder` is the only thing
        // that marks an order paid, so replacing it with a real redirect plus
        // a webhook is a change here and in one handler, nowhere else.
        await payOrder(order.reference, paymentRail);
      }
      router.push(`/booking/confirmation/${order.reference}`);
    } catch (err) {
      setWaiting(false);
      // A sold-out race is the expected failure and needs to say so plainly —
      // §11.6: never leave someone staring at a spinner that has given up.
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        status === 409
          ? locale === "fr"
            ? "Ce stock vient d'être vendu. Revenez en arrière pour choisir autre chose."
            : "That stock just sold. Go back and choose something else."
          : err instanceof Error
            ? err.message
            : "Checkout failed"
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
                          <select
                            value={mobileOperator}
                            onChange={(e) => update({ mobileOperator: e.target.value })}
                            className="w-full rounded-xl bg-white px-4 py-3 text-base font-semibold shadow-xs ring-1 ring-ink-100 outline-none ring-inset focus:ring-2 focus:ring-brand-500 max-w-xs"
                          >
                            {OPERATORS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/booking/contact")}
                className="btn btn-md btn-outline"
              >
                {t("checkout.back")}
              </button>
              <button
                type="submit"
                disabled={expired}
                className="rounded-md bg-accent-500 px-7 py-3.5 text-base font-bold text-brand-900 hover:bg-accent-600 disabled:opacity-50"
              >
                {isCash ? t("checkout.reserveCash") : t("checkout.payNow", { amount })}
              </button>
            </div>
          </form>

          <Summary />
        </div>
      </div>
    </Layout>
  );
}
