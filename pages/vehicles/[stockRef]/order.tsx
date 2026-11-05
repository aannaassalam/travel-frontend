import { ConsentBox, useNoRefundPolicy } from "@/components/checkout/parts";
import PaymentChoice from "@/components/checkout/PaymentChoice";
import { Price, PromoWas, SettlementNote } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { TextField } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/PhoneField";
import { ApiError, createOrder, getVehicle, startPayment } from "@/lib/api";
import { vehicleHref } from "@/lib/catalog";
import { Country, DEFAULT_COUNTRY, toE164 } from "@/lib/countries";
import { mediaUrl } from "@/lib/media";
import { addMoney, baseMinor, resolve } from "@/lib/money";
import { useOnlinePayment } from "@/lib/payments";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PaymentMethod } from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useRef, useState } from "react";

/**
 * Ordering a vehicle for sale: one page, as the restaurant checkout — contact,
 * how to pay, the no-refund consent — then the order's confirmation page. No
 * dates, no travellers, no delivery: one vehicle, the full price, collected at
 * its parking. The server re-prices it and reserves it in the same request
 * (409 ITEM_UNAVAILABLE when someone was quicker).
 */
export default function VehicleOrderPage() {
  const router = useRouter();
  const stockRef = String(router.query.stockRef ?? "");
  const { t, locale, currency, lz } = usePrefs();

  const { data: v, isPending, isError, refetch } = useQuery({
    queryKey: ["vehicle", stockRef],
    queryFn: ({ signal }) => getVehicle(stockRef, { signal }),
    enabled: Boolean(stockRef),
    refetchOnMount: true,
    staleTime: 30_000
  });

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [form, setForm] = useState({ firstName: "", lastName: "", national: "" });
  const policy = useNoRefundPolicy();
  const [agreedTo, setAgreedTo] = useState<string | undefined>();
  const agreed = Boolean(policy.shown && agreedTo === policy.shown);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | undefined>();

  // The price and the vehicle's processing fee, once.
  const fee = v?.processingFee;
  const hasFee = baseMinor(fee) > 0;
  const total = v ? addMoney(v.sellPrice, fee) : undefined;
  // Charged in the currency the total is shown in: never one the customer was not shown.
  const charged = resolve(total, currency).currency;
  const online = useOnlinePayment(charged);
  const [chosen, setChosen] = useState<PaymentMethod>("CASH");
  const method: PaymentMethod = online.available && chosen === "ONLINE" ? "ONLINE" : "CASH";

  const available = v?.availability === "AVAILABLE";
  const phone = toE164(country, form.national);
  const blocked = !form.firstName.trim() || !form.lastName.trim() || !phone || !agreed || !available;

  /** §4.6: one key per vehicle and currency, kept across presses (as the restaurant checkout). */
  const idem = useRef<{ sig: string; key: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || submitting || !v) return;
    setSubmitting(true);
    setError(null);
    setCode(undefined);
    const sig = JSON.stringify([v.id, charged]);
    const mint = () =>
      (idem.current = {
        sig,
        key: globalThis.crypto?.randomUUID?.() ?? `veh-${Date.now()}-${Math.random()}`
      }).key;
    if (idem.current?.sig !== sig) mint();
    const draft = {
      items: [{ vertical: "VEHICLE_SALE" as const, listingId: v.id, quantity: 1 }],
      contact: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: phone! },
      paymentMethod: method,
      currency: charged,
      locale,
      policyVersionId: policy.versionId
    };
    let reference: string | undefined;
    try {
      let order;
      try {
        order = await createOrder(draft, idem.current!.key);
      } catch (err) {
        // The key was spent by a different caller: a fresh one, exactly once.
        if (!(err instanceof ApiError && err.code === "IDEMPOTENCY_KEY_USED")) throw err;
        order = await createOrder(draft, mint());
      }
      reference = order.reference;
      // Online: MaxiCash's page, and back to /booking/payment/return/…. Cash on
      // an order first sent as online makes that same order a cash one.
      if (method === "ONLINE" || order.paymentMethod === "ONLINE") {
        const result = await startPayment(order.reference, method, locale);
        if (result.status === "REDIRECT") {
          window.location.assign(result.paymentUrl);
          return;
        }
      }
      router.push(`/booking/confirmation/${order.reference}`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "PAYMENT_BEING_CONFIRMED" && reference) {
        router.push(`/booking/confirmation/${reference}`);
        return;
      }
      // A key the server has finished with must not dead-end the next press.
      if (err instanceof ApiError && err.status === 409) idem.current = null;
      setCode(code);
      if (code === "POLICY_CHANGED") {
        setAgreedTo(undefined);
        policy.replace((err as ApiError).body?.policy);
      }
      // Someone else reserved it first: the page reads it again and says so.
      if (code === "ITEM_UNAVAILABLE") void refetch();
      const payment: Record<string, string> = {
        PAYMENT_UNAVAILABLE: t("pay.errUnavailable"),
        CASH_ONLY: t("pay.errUnavailable"),
        PROVIDER_ERROR: t("pay.errProvider"),
        PROVIDER_UNREACHABLE: t("pay.errUnreachable"),
        CURRENCY_UNSUPPORTED: t("pay.errOnlineCurrency"),
        AMOUNT_BELOW_MINIMUM: t("pay.errTooSmall")
      };
      setError(
        code && payment[code]
          ? `${payment[code]} ${t("pay.errNoCharge")}`
          : code === "ITEM_UNAVAILABLE"
            ? t("pg.vehicleOrder.errTaken")
            : code === "ACCOUNT_EXISTS"
              ? t("pay.errAccountExists")
              : code === "POLICY_CHANGED"
                ? t("pay.errPolicyChanged")
                : err instanceof ApiError
                  ? err.message
                  : t("pg.checkout.errSend")
      );
      setSubmitting(false);
    }
  }

  const title = t("pg.vehicle.order");

  if (isPending || !v) {
    return (
      <Layout title={title} description="" noindex>
        <div className="container-site py-16 text-center text-ink-500">
          {isError ? t("pg.vehicle.notFound") : t("common.loading")}
        </div>
      </Layout>
    );
  }

  const name = lz(v.title);
  const p = v.parking;

  return (
    <Layout title={title} description="" noindex>
      <div className="container-site max-w-4xl py-8">
        <h1 className="display mb-1 text-[26px] leading-tight text-brand-900 sm:text-[32px]">{title}</h1>
        <p className="mb-8 text-ink-500">
          <Link href={vehicleHref(v)} className="hover:underline">
            {name}
          </Link>{" "}
          · <span dir="ltr">{v.stockRef}</span>
        </p>

        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {/* --- the vehicle and where it is collected --- */}
            <section className="surface flex gap-4 p-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-ink-50">
                <Image src={mediaUrl(v.images?.[0] ?? v.image)} alt="" fill sizes="96px" className="object-cover" />
              </div>
              <div className="min-w-0 space-y-1 text-sm text-ink-700">
                <p className="font-bold text-brand-900">{name}</p>
                <p className="font-semibold text-ink-900">{t("cmp.pickup.title")}</p>
                <p className="flex gap-1.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" />
                  {[lz(p.name), p.address, p.city].filter(Boolean).join(", ")}
                </p>
                {lz(p.openingHours) && (
                  <p className="flex gap-1.5">
                    <Clock className="mt-0.5 size-4 shrink-0 text-brand-500" />
                    {lz(p.openingHours)}
                  </p>
                )}
              </div>
            </section>

            {!available && (
              <div role="alert" className="rounded-xl bg-warn-100 p-5 text-sm ring-1 ring-warn-600/30 ring-inset">
                <p className="font-semibold text-ink-900">
                  {t(v.availability === "SOLD" ? "pg.vehicle.soldBody" : "pg.vehicle.reservedBody")}
                </p>
                <Link href="/vehicles" className="btn btn-sm btn-dark mt-3">
                  {t("pg.vehicle.seeOthers")}
                </Link>
              </div>
            )}

            {/* --- who --- */}
            <section className="surface space-y-5 p-5">
              <h2 className="text-lg font-bold text-brand-900">{t("pg.vehicleOrder.contact")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={t("checkout.firstName")}
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  autoComplete="given-name"
                  required
                />
                <TextField
                  label={t("checkout.lastName")}
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  autoComplete="family-name"
                  required
                />
              </div>
              <PhoneField
                label={t("pg.checkout.phone")}
                country={country}
                national={form.national}
                onCountryChange={setCountry}
                onNationalChange={(value) => setForm({ ...form, national: value })}
                helper={t("pg.vehicleOrder.phoneHelper")}
              />
            </section>
          </div>

          {/* --- summary --- */}
          <aside className="space-y-4 lg:sticky lg:top-header lg:self-start">
            <div className="surface space-y-3 p-5">
              {/* With a fee, the price (and its promotion) on its own line, then the fee. */}
              {hasFee && (
                <>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink-700">{t("checkout.subtotal")}</span>
                    <span className="text-end">
                      <PromoWas promotion={v.promotion} className="text-xs" />
                      <Price money={v.sellPrice} className="block font-semibold text-ink-900" />
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-ink-700">{t("checkout.processingFees")}</span>
                    <Price money={fee} className="font-semibold text-ink-900" />
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between gap-3 text-base">
                <span className="font-bold text-brand-900">{t("pg.checkout.total")}</span>
                <span className="text-end">
                  {!hasFee && <PromoWas promotion={v.promotion} className="text-xs" />}
                  <Price money={total} className="block text-lg font-bold text-brand-900" />
                </span>
              </div>
              <SettlementNote money={total} />

              <fieldset className="pt-2">
                <legend className="eyebrow mb-2 text-brand-600">{t("pg.checkout.payment")}</legend>
                <PaymentChoice
                  value={method}
                  onChange={(next) => {
                    setChosen(next);
                    setError(null);
                  }}
                  online={online}
                  cashLabel={t("checkout.cash")}
                  cashNote={t("checkout.cashNote")}
                />
              </fieldset>

              {/* §2.2(1): separate, unticked, blocking — and the published text. */}
              <ConsentBox
                policy={policy}
                checked={agreed}
                onChange={(on) => setAgreedTo(on ? policy.shown : undefined)}
              />

              {error && (
                <div role="alert" className="rounded-xl bg-bad-100 p-3 text-sm text-bad-600">
                  <p>{error}</p>
                  {code === "ACCOUNT_EXISTS" && (
                    <Link href={`/login?next=${encodeURIComponent(router.asPath)}`} className="btn btn-sm btn-dark mt-3">
                      {t("nav.signin")}
                    </Link>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !available}
                aria-disabled={blocked || undefined}
                className={cn(
                  "w-full rounded-md px-6 py-3.5 text-base font-bold text-brand-900 transition-colors",
                  blocked ? "cursor-not-allowed bg-accent-500/40" : "bg-accent-500 hover:bg-accent-600",
                  "disabled:opacity-50"
                )}
              >
                {submitting
                  ? t(method === "ONLINE" ? "checkout.waitingOnline" : "common.loading")
                  : method === "ONLINE"
                    ? t("pg.checkout.submitOnline")
                    : t("pg.vehicleOrder.submitCash")}
              </button>

              {blocked && available && (
                <p className="text-center text-xs text-ink-500">{t("pg.vehicleOrder.blocked")}</p>
              )}
            </div>
          </aside>
        </form>
      </div>
    </Layout>
  );
}
