import {
  BASE_CURRENCY,
  Currency,
  Money
} from "@/typescript/interface/domain.interface";

/**
 * §5. Money is integer minor units plus an ISO-4217 code. Never a float, never
 * a price without a currency.
 *
 * The catalogue carries an explicit price per currency (`Money`), typed by the
 * administrator rather than converted at read time — so what the customer sees
 * is what they are charged, and no rate movement can open a gap between the two.
 *
 * Conversion still exists, for one job only: a currency the administrator has
 * not priced. That result is marked approximate everywhere it is shown, because
 * presenting a derived number as if it were the charge is exactly the ambiguity
 * §5 warns generates disputes.
 */
export const MINOR_UNIT_EXPONENT: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  // CDF is handled as 0 decimals. The exponent lives here and nowhere else, so
  // "confirm with the gateway before the migration" is a one-line change rather
  // than a hunt. Getting it wrong by 100x is a live-payment incident.
  CDF: 0
};

/** §5: admin-controlled rates, never a live feed. Shape matches GET /api/v1/fx. */
export const FX_RATES: Record<
  Currency,
  { rate: number; spreadPct: number; effectiveFrom: string }
> = {
  USD: { rate: 1, spreadPct: 0, effectiveFrom: "2026-07-01" },
  CDF: { rate: 2870, spreadPct: 1.5, effectiveFrom: "2026-07-28" },
  EUR: { rate: 0.92, spreadPct: 1.0, effectiveFrom: "2026-07-28" }
};

/** USD minor units → another currency's minor units, at the admin rate. */
export function convert(usdMinor: number, to: Currency): number {
  if (to === BASE_CURRENCY) return usdMinor;
  const { rate, spreadPct } = FX_RATES[to];
  const usdMajor = usdMinor / 10 ** MINOR_UNIT_EXPONENT.USD;
  const target = usdMajor * rate * (1 + spreadPct / 100);
  const minor = target * 10 ** MINOR_UNIT_EXPONENT[to];
  // Round up to a sensible display unit in CDF; rounding down would leave the
  // client short on every sale.
  return to === "CDF" ? Math.ceil(minor / 100) * 100 : Math.round(minor);
}

/** Money in the display currency: the typed price, or a converted fallback. */
export function resolve(
  money: Money | number | undefined,
  currency: Currency
): { minor: number; exact: boolean } {
  // A bare number is a pre-migration record; treat it as the USD base.
  if (typeof money === "number") {
    return currency === BASE_CURRENCY
      ? { minor: money, exact: true }
      : { minor: convert(money, currency), exact: false };
  }
  const typed = money?.[currency];
  if (typeof typed === "number" && typed > 0) return { minor: typed, exact: true };
  const usd = money?.USD ?? 0;
  return currency === BASE_CURRENCY
    ? { minor: usd, exact: true }
    : { minor: convert(usd, currency), exact: false };
}

/** The base-currency amount — what totals, sorting and reporting compare. */
export const baseMinor = (money: Money | number | undefined): number =>
  typeof money === "number" ? money : (money?.USD ?? 0);

const LOCALE_FOR_FORMAT: Record<string, string> = { fr: "fr-FR", en: "en-GB" };

/**
 * §6: DRC conventions — space thousands separator, comma decimal — come free
 * from Intl with fr-FR. Never hand-build a currency string.
 */
export function formatMoney(
  minor: number,
  currency: Currency,
  locale = "fr"
): string {
  const digits = MINOR_UNIT_EXPONENT[currency];
  // Whole amounts drop the decimals: travel prices are quoted as "$480", and a
  // wall of "480,00 $US" reads as an accounting export. Display only — the
  // stored value is always exact.
  const fraction = minor % 10 ** digits === 0 ? 0 : digits;
  return new Intl.NumberFormat(LOCALE_FOR_FORMAT[locale] ?? "fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction
  }).format(minor / 10 ** digits);
}

/** Resolve then format — the pairing behind nearly every price on the site. */
export function price(
  money: Money | number | undefined,
  currency: Currency,
  locale = "fr"
): string {
  const { minor, exact } = resolve(money, currency);
  const text = formatMoney(minor, currency, locale);
  return exact ? text : `≈ ${text}`;
}

/** True when the displayed figure is a conversion rather than a typed price. */
export const isApproximate = (
  money: Money | number | undefined,
  currency: Currency
) => !resolve(money, currency).exact;

/**
 * §5: "You will be charged 2 850 000 CDF (≈ $980)". Ambiguity about the
 * settlement currency generates disputes, and disputes are expensive when
 * there is no refund path to defuse them.
 */
export function settlementNote(
  money: Money | number | undefined,
  currency: Currency,
  locale = "fr"
): string | null {
  if (currency === BASE_CURRENCY) return null;
  return `${price(money, currency, locale)} (${formatMoney(
    baseMinor(money),
    "USD",
    locale
  )})`;
}

/** Multiply a whole Money by a quantity — every currency scales together. */
export function multiply(money: Money | number | undefined, factor: number): Money {
  if (typeof money === "number") return { USD: money * factor };
  const out: Money = {};
  for (const [c, v] of Object.entries(money ?? {})) {
    if (typeof v === "number") out[c as Currency] = Math.round(v * factor);
  }
  return out.USD === undefined ? { ...out, USD: 0 } : out;
}

export function nightsBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}
