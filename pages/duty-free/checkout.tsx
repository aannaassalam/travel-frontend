import { ConsentBox, useNoRefundPolicy } from "@/components/checkout/parts";
import PaymentChoice from "@/components/checkout/PaymentChoice";
import Layout from "@/components/site/Layout";
import { TextAreaField, TextField } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/PhoneField";
import { ApiError, createOrder, startPayment } from "@/lib/api";
import { useDutyFreeCart } from "@/lib/cart";
import { Country, DEFAULT_COUNTRY, toE164 } from "@/lib/countries";
import { dutyFreeTotals, getDutyFreePoints, searchDutyFreeProducts } from "@/lib/dutyFree";
import { baseMinor, price, resolve } from "@/lib/money";
import { useOnlinePayment } from "@/lib/payments";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PaymentMethod } from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Clock, MapPin, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Duty Free checkout, after the restaurant one: contact, a delivery point,
 * payment, the no-refund box. One order for every shop in the basket — the
 * office collects from each — with the point's fee once and each shop's
 * processing fee once. Every figure is priced again by the server.
 */
export default function DutyFreeCheckoutPage() {
  const router = useRouter();
  const { t, locale, currency, lz } = usePrefs();
  const { ready, lines, setQuantity, remove, clear } = useDutyFreeCart();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [form, setForm] = useState({ firstName: "", lastName: "", national: "", pointId: "", address: "", notes: "" });
  const policy = useNoRefundPolicy();
  const [agreedTo, setAgreedTo] = useState<string | undefined>();
  const agreed = Boolean(policy.shown && agreedTo === policy.shown);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | undefined>();

  // The points from the server, those of the basket's shops' towns: a town the
  // office adds shows by itself.
  const shopIds = [...new Set(lines.map((l) => l.shopId).filter((id): id is string => Boolean(id)))].sort();
  const pointsQ = useQuery({
    queryKey: ["duty-free", "points", shopIds],
    queryFn: ({ signal }) => getDutyFreePoints(shopIds, { signal }),
    enabled: ready,
    staleTime: 30_000
  });
  // The basket's products as they are now: a price, a fee or the stock may
  // have changed in the admin while it sat open.
  const ids = lines.map((l) => l.menuItemId).join(",");
  const freshQ = useQuery({
    queryKey: ["duty-free", "products", { ids }],
    queryFn: ({ signal }) => searchDutyFreeProducts({ ids, limit: lines.length }, { signal }),
    enabled: Boolean(ids),
    staleTime: 30_000
  });
  const fresh = useMemo(() => new Map((freshQ.data?.items ?? []).map((p) => [p.id, p])), [freshQ.data]);
  const priced = useMemo(
    () =>
      lines.map((l) => {
        const p = fresh.get(l.menuItemId);
        return p
          ? { ...l, unitPrice: p.sellPrice, shopId: p.shop.id, shopName: lz(p.shop.name), fee: p.shop.processingFee, soldOut: !p.isAvailable }
          : { ...l, soldOut: false };
      }),
    [lines, fresh, lz]
  );
  const soldOut = priced.some((l) => l.soldOut);

  const points = useMemo(() => pointsQ.data ?? [], [pointsQ.data]);
  // Preselected only when there is no choice: the fee differs from point to point.
  useEffect(() => {
    if (points.length === 1 && !form.pointId) setForm((f) => ({ ...f, pointId: points[0].id }));
  }, [points, form.pointId]);
  const point = points.find((p) => p.id === form.pointId) ?? null;
  const { subtotal, fees, total } = dutyFreeTotals(priced, point?.fee);

  // Lines by shop, in the order they were added: the office collects shop by shop.
  const shops = useMemo(() => {
    const out = new Map<string, typeof priced>();
    for (const l of priced) out.set(l.shopName ?? "", [...(out.get(l.shopName ?? "") ?? []), l]);
    return [...out];
  }, [priced]);

  const charged = resolve(total, currency).currency;
  const online = useOnlinePayment(charged);
  const [chosen, setChosen] = useState<PaymentMethod>("CASH");
  const method: PaymentMethod = online.available && chosen === "ONLINE" ? "ONLINE" : "CASH";
  // Collected at the office: paid there or by mobile money. Brought anywhere else: cash on delivery.
  const atOffice = !point || point.kind === "OFFICE";

  const phone = toE164(country, form.national);
  const blocked =
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !phone ||
    !point ||
    (point.needsAddress && !form.address.trim()) ||
    soldOut ||
    !agreed;

  /** §4.6: one key per basket, kept across presses; new only when what is priced changes. */
  const idem = useRef<{ sig: string; key: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || submitting) return;
    setSubmitting(true);
    setError(null);
    setCode(undefined);
    const sig = JSON.stringify([lines.map((l) => [l.menuItemId, l.quantity]), point!.id, charged]);
    const mint = () =>
      (idem.current = { sig, key: globalThis.crypto?.randomUUID?.() ?? `df-${Date.now()}-${Math.random()}` }).key;
    if (idem.current?.sig !== sig) mint();
    const draft = {
      items: lines.map((l) => ({ vertical: "DUTY_FREE" as const, listingId: l.menuItemId, quantity: l.quantity })),
      delivery: {
        zoneId: point!.id,
        address: point!.needsAddress ? form.address.trim() : undefined,
        notes: form.notes.trim() || undefined
      },
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
        if (!(err instanceof ApiError && err.code === "IDEMPOTENCY_KEY_USED")) throw err;
        order = await createOrder(draft, mint());
      }
      reference = order.reference;
      if (method === "ONLINE" || order.paymentMethod === "ONLINE") {
        const result = await startPayment(order.reference, method, locale);
        if (result.status === "REDIRECT") {
          clear();
          window.location.assign(result.paymentUrl);
          return;
        }
      }
      clear();
      router.push(`/booking/confirmation/${order.reference}`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "PAYMENT_BEING_CONFIRMED" && reference) {
        clear();
        router.push(`/booking/confirmation/${reference}`);
        return;
      }
      if (err instanceof ApiError && err.status === 409) idem.current = null;
      setCode(code);
      if (code === "POLICY_CHANGED") {
        setAgreedTo(undefined);
        policy.replace((err as ApiError).body?.policy);
      }
      // A product went out of stock meanwhile: re-read, so its line says which.
      if (code === "ITEM_UNAVAILABLE") void freshQ.refetch();
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
          : code === "ACCOUNT_EXISTS"
            ? t("pay.errAccountExists")
            : code === "POLICY_CHANGED"
              ? t("pay.errPolicyChanged")
              : code === "ITEM_UNAVAILABLE"
                ? t("pg.dutyFree.errUnavailable")
                : err instanceof ApiError
                ? err.message
                : t("pg.checkout.errSend")
      );
      setSubmitting(false);
    }
  }

  const title = t("pg.dutyFree.checkoutTitle");

  if (ready && !lines.length) {
    return (
      <Layout title={title} description="" noindex>
        <div className="container-site py-20 text-center">
          <ShoppingBag className="mx-auto mb-4 size-10 text-ink-300" />
          <h1 className="text-xl font-bold text-brand-900">{t("pg.checkout.emptyTitle")}</h1>
          <Link href="/duty-free" className="btn btn-md btn-dark mt-6">
            {t("pg.dutyFree.browse")}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={title} description="" noindex>
      <div className="container-site max-w-4xl py-8">
        <h1 className="display mb-8 text-[26px] leading-tight text-brand-900 sm:text-[32px]">{title}</h1>

        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-8">
            {/* --- basket, shop by shop --- */}
            <section className="surface p-5">
              <h2 className="mb-2 text-lg font-bold text-brand-900">{t("pg.dutyFree.yourItems")}</h2>
              {shops.map(([shop, items]) => (
                <div key={shop} className="pt-3">
                  {shop && <p className="eyebrow text-brand-600">{t("pg.dutyFree.soldBy", { shop })}</p>}
                  <ul className="divide-y divide-ink-100">
                    {items.map((l) => (
                      <li key={l.menuItemId} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink-900">{l.name}</p>
                          <p className={cn("text-sm", l.soldOut ? "font-semibold text-bad-600" : "text-ink-500")}>
                            {l.soldOut ? t("pg.dutyFree.outOfStock") : price(l.unitPrice, currency, locale)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 rounded-xl bg-brand-50 p-1 ring-1 ring-brand-100 ring-inset">
                          <button
                            type="button"
                            onClick={() => setQuantity(l.menuItemId, l.quantity - 1)}
                            aria-label={t("pg.menu.removeOne")}
                            className="grid size-8 place-items-center rounded-lg text-brand-900 hover:bg-white"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="tnum w-6 text-center text-sm font-bold text-brand-900">{l.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(l.menuItemId, l.quantity + 1)}
                            aria-label={t("pg.menu.addOne")}
                            className="grid size-8 place-items-center rounded-lg text-brand-900 hover:bg-white"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(l.menuItemId)}
                          aria-label={t("pg.checkout.removeItem", { name: l.name })}
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-bad-100 hover:text-bad-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            {/* --- where --- */}
            <section className="surface space-y-4 p-5">
              <div>
                <h2 className="text-lg font-bold text-brand-900">{t("pg.dutyFree.point")}</h2>
                <p className="text-sm text-ink-500">{t("pg.dutyFree.pointHelp")}</p>
              </div>

              {pointsQ.isPending ? (
                <p className="text-sm text-ink-500">{t("common.loading")}</p>
              ) : !points.length ? (
                <p className="rounded-xl bg-bad-100 p-3 text-sm text-bad-600">{t("pg.dutyFree.noPoints")}</p>
              ) : (
                <div role="radiogroup" aria-label={t("pg.dutyFree.point")} className="grid gap-3 sm:grid-cols-2">
                  {points.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer gap-3 rounded-xl bg-white p-4 ring-1 ring-ink-100 transition-colors ring-inset hover:ring-brand-500 has-checked:bg-brand-50 has-checked:ring-2 has-checked:ring-brand-900"
                    >
                      <input
                        type="radio"
                        name="point"
                        value={p.id}
                        checked={form.pointId === p.id}
                        onChange={() => setForm({ ...form, pointId: p.id })}
                        className="mt-1 size-4 shrink-0 accent-brand-900"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-ink-900">{lz(p.name)}</span>
                          <span className="tnum shrink-0 text-sm font-semibold text-brand-900">
                            {baseMinor(p.fee) > 0 ? price(p.fee, currency, locale) : t("pg.dutyFree.free")}
                          </span>
                        </span>
                        {p.kind === "OFFICE" && p.address && (
                          <span className="mt-1 flex items-start gap-1 text-xs text-ink-500">
                            <MapPin className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                            {t("pg.dutyFree.collectAt", { address: p.address })}
                          </span>
                        )}
                        {p.etaMinutes ? (
                          <span className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                            {t("pg.menu.minutes", { n: p.etaMinutes })}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Any point but the office: which terminal, hotel, restaurant or address. */}
              {point?.needsAddress && (
                <TextField
                  label={t(`pg.dutyFree.address.${point.kind}`)}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  autoComplete={point.kind === "OTHER" ? "street-address" : "off"}
                  required
                />
              )}
            </section>

            {/* --- who --- */}
            <section className="surface space-y-5 p-5">
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
                onNationalChange={(v) => setForm({ ...form, national: v })}
                helper={t("pg.dutyFree.phoneHelper")}
              />
              <TextAreaField
                label={t("pg.checkout.notes")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </section>
          </div>

          {/* --- summary --- */}
          <aside className="space-y-4 lg:sticky lg:top-header lg:self-start">
            <div className="surface space-y-3 p-5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-ink-700">{t("checkout.subtotal")}</span>
                <span className="tnum font-semibold text-ink-900">{price(subtotal, currency, locale)}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-ink-700">{t("pg.checkout.delivery")}</span>
                <span className="tnum text-end font-semibold text-ink-900">
                  {!point
                    ? t("pg.dutyFree.pickPoint")
                    : baseMinor(point.fee) > 0
                      ? price(point.fee, currency, locale)
                      : t("pg.dutyFree.free")}
                </span>
              </div>
              {baseMinor(fees) > 0 && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-ink-700">{t("checkout.processingFees")}</span>
                  <span className="tnum font-semibold text-ink-900">{price(fees, currency, locale)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-ink-100 pt-3 text-base">
                <span className="font-bold text-brand-900">{t("pg.checkout.total")}</span>
                <span className="tnum text-lg font-bold text-brand-900">{price(total, currency, locale)}</span>
              </div>

              <fieldset className="pt-2">
                <legend className="eyebrow mb-2 text-brand-600">{t("pg.checkout.payment")}</legend>
                {online.available ? (
                  <PaymentChoice
                    value={method}
                    onChange={(next) => {
                      setChosen(next);
                      setError(null);
                    }}
                    online={online}
                    cashLabel={t(atOffice ? "checkout.cash" : "pg.checkout.cash")}
                    cashNote={t(atOffice ? "checkout.cashNote" : "pg.checkout.cashNote")}
                  />
                ) : (
                  <>
                    <p className="flex items-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-sm font-semibold text-white">
                      <Banknote className="size-4 shrink-0" />
                      {t(atOffice ? "checkout.cash" : "pg.checkout.cash")}
                    </p>
                    {online.offered && <p className="mt-2 text-sm text-ink-500">{t("checkout.onlineUsdOnly")}</p>}
                  </>
                )}
              </fieldset>

              <ConsentBox
                policy={policy}
                checked={agreed}
                onChange={(v) => setAgreedTo(v ? policy.shown : undefined)}
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
                disabled={submitting}
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
                    : t(atOffice ? "pg.dutyFree.submitOffice" : "pg.checkout.submitCash")}
              </button>
              {blocked && <p className="text-center text-xs text-ink-500">{t("pg.dutyFree.blocked")}</p>}
            </div>
          </aside>
        </form>
      </div>
    </Layout>
  );
}
