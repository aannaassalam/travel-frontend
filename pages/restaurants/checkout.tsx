import Layout from "@/components/site/Layout";
import { TextAreaField, TextField } from "@/components/ui/field";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { PhoneField } from "@/components/ui/PhoneField";
import { ApiError, createOrder, getRestaurant } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { Country, DEFAULT_COUNTRY, toE164 } from "@/lib/countries";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Money } from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Bike, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Restaurant checkout.
 *
 * A separate page from `/booking/*` rather than a branch inside it. That flow
 * is contact → travellers → payment and carries dates, a stock hold and a
 * countdown; a food order has an address, no travellers and nothing held.
 * Threading a fourth mode through those three screens would put a traveller
 * form behind a condition on every one of them.
 *
 * Every figure shown here is re-priced server-side. The subtotal below is the
 * customer's arithmetic, not the charge — `createOrder` returns the real total.
 */
export default function RestaurantCheckoutPage() {
  const router = useRouter();
  const { t, locale, currency } = usePrefs();
  const {
    ready,
    lines,
    restaurantSlug,
    restaurantName,
    subtotal,
    setQuantity,
    remove,
    clear
  } = useCart();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    national: "",
    address: "",
    zoneId: "",
    notes: ""
  });
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The server's reason code, for the one failure that needs a button. */
  const [code, setCode] = useState<string | undefined>();

  // The menu is not needed here, but the zones and the prep time are — and they
  // must come from the server rather than the cart, so a fee the office edited
  // while the basket sat open is the one the customer is shown.
  const { data } = useQuery({
    queryKey: ["restaurant", restaurantSlug],
    queryFn: ({ signal }) => getRestaurant(restaurantSlug!, { signal }),
    enabled: Boolean(restaurantSlug),
    staleTime: 30_000
  });
  const restaurant = data?.restaurant;
  const zones = restaurant?.deliveryZones ?? [];

  // Preselect only when there is no choice to make; otherwise the customer
  // picks, because the fee differs and a silent default costs them money.
  useEffect(() => {
    if (zones.length === 1 && !form.zoneId) setForm((f) => ({ ...f, zoneId: zones[0].id }));
  }, [zones, form.zoneId]);

  const zone = zones.find((z) => z.id === form.zoneId) ?? null;

  const total = useMemo<Money>(() => {
    if (!zone) return subtotal;
    // Only currencies both the food and the fee carry — matching how the
    // server decides what it can settle in.
    const out: Money = {};
    for (const c of Object.keys(subtotal) as (keyof Money)[]) {
      if (typeof zone.fee[c] === "number") out[c] = (subtotal[c] ?? 0) + (zone.fee[c] ?? 0);
    }
    return Object.keys(out).length ? out : subtotal;
  }, [subtotal, zone]);

  const belowMinimum =
    zone?.minOrder && (subtotal.USD ?? 0) < (zone.minOrder.USD ?? 0) ? zone.minOrder : null;

  const phone = toE164(country, form.national);
  const blocked =
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !phone ||
    !form.address.trim() ||
    !zone ||
    Boolean(belowMinimum) ||
    !terms;

  /**
   * §4.6: one key per basket, kept across presses. It used to be minted inside
   * submit() with the clock in it, so every press was a new key — and a press
   * after a dropped response cooked the food twice. It changes only when what
   * the server would price changes.
   */
  const idem = useRef<{ sig: string; key: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || submitting) return;
    setSubmitting(true);
    setError(null);
    setCode(undefined);
    const sig = JSON.stringify([
      restaurantSlug,
      lines.map((l) => [l.menuItemId, l.quantity]),
      zone?.id,
      currency
    ]);
    const mint = () =>
      (idem.current = {
        sig,
        key: globalThis.crypto?.randomUUID?.() ?? `rest-${Date.now()}-${Math.random()}`
      }).key;
    if (idem.current?.sig !== sig) mint();
    const draft = {
      items: lines.map((l) => ({
        vertical: "RESTAURANT" as const,
        listingId: l.menuItemId,
        quantity: l.quantity
      })),
      delivery: {
        address: form.address.trim(),
        zoneId: zone!.id,
        notes: form.notes.trim() || undefined
      },
      contact: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: phone!
      },
      // Cash only: the server answers 400 CASH_ONLY to anything else.
      paymentMethod: "CASH" as const,
      currency,
      locale
    };
    try {
      let order;
      try {
        order = await createOrder(draft, idem.current!.key);
      } catch (err) {
        // The key was spent by a different caller: a fresh one, exactly once.
        if (!(err instanceof ApiError && err.code === "IDEMPOTENCY_KEY_USED")) throw err;
        order = await createOrder(draft, mint());
      }
      clear();
      router.push(`/booking/confirmation/${order.reference}`);
    } catch (err) {
      // A key the server has finished with (cancelled order, other currency)
      // must not dead-end the next press.
      if (err instanceof ApiError && err.status === 409) idem.current = null;
      const code = err instanceof ApiError ? err.code : undefined;
      setCode(code);
      setError(
        code === "ACCOUNT_EXISTS"
          ? t("pay.errAccountExists")
          : err instanceof ApiError
            ? err.message
            : locale === "fr"
              ? "La commande n’a pas pu être envoyée. Réessayez."
              : "The order could not be sent. Try again."
      );
      setSubmitting(false);
    }
  }

  const title = locale === "fr" ? "Votre commande" : "Your order";

  if (ready && !lines.length) {
    return (
      <Layout title={title} description="" noindex>
        <div className="container-site py-20 text-center">
          <ShoppingBag className="mx-auto mb-4 size-10 text-ink-300" />
          <h1 className="text-xl font-bold text-brand-900">
            {locale === "fr" ? "Votre panier est vide" : "Your basket is empty"}
          </h1>
          <button
            type="button"
            onClick={() => router.push("/restaurants")}
            className="btn btn-md btn-dark mt-6"
          >
            {locale === "fr" ? "Voir les restaurants" : "Browse restaurants"}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={title} description="" noindex>
      <div className="container-site max-w-4xl py-8">
        <h1 className="display mb-1 text-[26px] leading-tight text-brand-900 sm:text-[32px]">
          {title}
        </h1>
        <p className="mb-8 text-ink-500">{restaurantName}</p>

        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {/* --- basket --- */}
            <section className="surface p-5">
              <h2 className="mb-4 text-lg font-bold text-brand-900">
                {locale === "fr" ? "Vos plats" : "Your food"}
              </h2>
              <ul className="divide-y divide-ink-100">
                {lines.map((l) => (
                  <li key={l.menuItemId} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">{l.name}</p>
                      <p className="text-sm text-ink-500">
                        {price(l.unitPrice, currency, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl bg-brand-50 p-1 ring-1 ring-brand-100 ring-inset">
                      <button
                        type="button"
                        onClick={() => setQuantity(l.menuItemId, l.quantity - 1)}
                        aria-label={locale === "fr" ? "Retirer un" : "Remove one"}
                        className="grid size-8 place-items-center rounded-lg text-brand-900 hover:bg-white"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="tnum w-6 text-center text-sm font-bold text-brand-900">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(l.menuItemId, l.quantity + 1)}
                        aria-label={locale === "fr" ? "Ajouter un" : "Add one"}
                        className="grid size-8 place-items-center rounded-lg text-brand-900 hover:bg-white"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(l.menuItemId)}
                      aria-label={locale === "fr" ? `Retirer ${l.name}` : `Remove ${l.name}`}
                      className="grid size-9 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-bad-100 hover:text-bad-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* --- who and where --- */}
            <section className="surface space-y-5 p-5">
              <h2 className="text-lg font-bold text-brand-900">
                {locale === "fr" ? "Livraison" : "Delivery"}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={locale === "fr" ? "Prénom" : "First name"}
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  autoComplete="given-name"
                  required
                />
                <TextField
                  label={locale === "fr" ? "Nom" : "Last name"}
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  autoComplete="family-name"
                  required
                />
              </div>

              <PhoneField
                label={locale === "fr" ? "Téléphone" : "Phone"}
                country={country}
                national={form.national}
                onCountryChange={setCountry}
                onNationalChange={(v) => setForm({ ...form, national: v })}
                helper={
                  locale === "fr"
                    ? "Le livreur vous appelle sur ce numéro."
                    : "The driver calls you on this number."
                }
              />

              <TextField
                label={locale === "fr" ? "Adresse de livraison" : "Delivery address"}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                autoComplete="street-address"
                required
              />

              <div>
                <span className="eyebrow mb-2 block text-brand-600">
                  {locale === "fr" ? "Zone" : "Zone"}
                </span>
                <InlineSelect
                  ariaLabel={locale === "fr" ? "Zone de livraison" : "Delivery zone"}
                  value={form.zoneId}
                  onValueChange={(v) => setForm({ ...form, zoneId: v })}
                  options={zones.map((z) => ({
                    value: z.id,
                    label: `${z.name} — ${price(z.fee, currency, locale)} · ${
                      (restaurant?.prepTimeMinutes ?? 0) + z.etaMinutes
                    } min`
                  }))}
                  triggerClassName="w-full rounded-xl px-4 py-3.5 shadow-xs"
                />
                {belowMinimum && (
                  <p className="mt-2 text-sm text-bad-600">
                    {locale === "fr"
                      ? `Commande minimum de ${price(belowMinimum, currency, locale)} pour cette zone.`
                      : `This zone has a ${price(belowMinimum, currency, locale)} minimum order.`}
                  </p>
                )}
              </div>

              <TextAreaField
                label={locale === "fr" ? "Indications (facultatif)" : "Directions (optional)"}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                helper={
                  locale === "fr"
                    ? "Deuxième portail, demander Papa Jean…"
                    : "Second gate, ask for Papa Jean…"
                }
              />
            </section>
          </div>

          {/* --- summary --- */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="surface space-y-3 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-700">{locale === "fr" ? "Sous-total" : "Subtotal"}</span>
                <span className="tnum font-semibold text-ink-900">
                  {price(subtotal, currency, locale)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5 text-ink-700">
                  <Bike className="size-4 text-brand-500" />
                  {locale === "fr" ? "Livraison" : "Delivery"}
                </span>
                <span className="tnum font-semibold text-ink-900">
                  {zone
                    ? price(zone.fee, currency, locale)
                    : locale === "fr"
                      ? "Choisir une zone"
                      : "Pick a zone"}
                </span>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
                <span className="font-bold text-brand-900">{locale === "fr" ? "Total" : "Total"}</span>
                <span className="tnum text-lg font-bold text-brand-900">
                  {price(total, currency, locale)}
                </span>
              </div>

              <fieldset className="pt-2">
                <legend className="eyebrow mb-2 text-brand-600">
                  {locale === "fr" ? "Paiement" : "Payment"}
                </legend>
                {/* Cash only: stated, not chosen. */}
                <p className="flex items-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-sm font-semibold text-white">
                  <Banknote className="size-4 shrink-0" />
                  {locale === "fr" ? "Espèces à la livraison" : "Cash on delivery"}
                </p>
              </fieldset>

              <label className="flex cursor-pointer items-start gap-2.5 pt-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>
                  {locale === "fr"
                    ? "J’accepte que la commande soit ferme et non remboursable une fois préparée."
                    : "I accept the order is firm and non-refundable once it is being cooked."}
                </span>
              </label>

              {error && (
                <div role="alert" className="rounded-xl bg-bad-100 p-3 text-sm text-bad-600">
                  <p>{error}</p>
                  {/* The basket lives in storage, so it is still here after sign-in. */}
                  {code === "ACCOUNT_EXISTS" && (
                    <Link
                      href={`/login?next=${encodeURIComponent(router.asPath)}`}
                      className="btn btn-sm btn-dark mt-3"
                    >
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
                  ? t("common.loading")
                  : locale === "fr"
                    ? "Commander — payer à la livraison"
                    : "Order — pay on delivery"}
              </button>

              {blocked && !belowMinimum && (
                <p className="text-center text-xs text-ink-500">
                  {locale === "fr"
                    ? "Complétez vos coordonnées, l’adresse et la zone."
                    : "Fill in your details, address and zone."}
                </p>
              )}
            </div>
          </aside>
        </form>
      </div>
    </Layout>
  );
}
