import {
  BASE_CURRENCY,
  Currency,
  Money
} from "@/typescript/interface/domain.interface";

/**
 * §5. Money is integer minor units plus an ISO-4217 code. Never a float, never
 * a price without a currency.
 *
 * The catalogue carries a price per currency (`Money`). The office enters
 * francs only; the API works out USD and EUR from the exchange rates set in the
 * admin (francs per dollar, per euro) and sends each one that has a rate, and
 * an order is charged exactly those figures.
 *
 * No price is converted here. A currency the API sent no price in (no rate
 * set) is shown in the francs the price was entered in. This file used to fill
 * the gap with a rate of its own (2 870 FC + 1.5 %, marked ≈), which is the
 * "conversion is not accurate" customers saw next to the office's real figures.
 */
export const MINOR_UNIT_EXPONENT: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  // CDF is handled as 0 decimals. The exponent lives here and nowhere else, so
  // "confirm with the gateway before the migration" is a one-line change rather
  // than a hunt. Getting it wrong by 100x is a live-payment incident.
  CDF: 0
};

/**
 * A price as it is shown: the API's figure in the visitor's currency, or the
 * franc base when it sent none. `currency` is the one actually shown — the one
 * a checkout must ask to be charged in.
 */
export function resolve(
  money: Money | number | undefined,
  currency: Currency
): { minor: number; currency: Currency } {
  // A bare number is a base amount: francs.
  if (typeof money === "number") return { minor: money, currency: BASE_CURRENCY };
  // A 0 is a real figure too (a free infant fare or delivery): the API works
  // every currency out from francs, so it never sends a 0 to mean "no price".
  const typed = money?.[currency];
  if (typeof typed === "number") return { minor: typed, currency };
  return { minor: money?.CDF ?? 0, currency: BASE_CURRENCY };
}

/**
 * A bare franc amount (a filter bound or a deposit, not a catalogue price) in
 * each currency the office has a rate for, worked out exactly as the server's
 * fx.service `convert`: dollars and euros rounded UP to the cent, so the office
 * is never short (`toFixed` drops the float noise first). Not a guess — the
 * office's own rates (francs per 1 unit) from /site/currencies; without one,
 * the amount stays in francs only.
 */
export function fromBase(
  cdf: number,
  rates: Partial<Record<Currency, number>> | undefined
): Money {
  const out: Money = { CDF: cdf };
  for (const c of ["USD", "EUR"] as const) {
    const rate = rates?.[c];
    if (!rate || !(rate > 0)) continue;
    out[c] = Math.ceil(Number(((cdf / rate) * 100).toFixed(6)));
  }
  return out;
}

/** The base-currency amount (francs) — what totals, sorting and reporting compare. */
export const baseMinor = (money: Money | number | undefined): number =>
  typeof money === "number" ? money : (money?.CDF ?? 0);

/**
 * The currency prices are shown in: the visitor's own choice while it is still
 * offered; otherwise francs, the base, which always are (and the client's
 * default). Until the server has said what is offered, the choice stands —
 * `resolve` shows francs for any price the API sent nothing in, so nothing is
 * invented while waiting.
 */
export function pickCurrency(
  saved: Currency | undefined,
  offered: readonly Currency[] | undefined
): Currency {
  const wanted = saved ?? BASE_CURRENCY;
  return !offered || offered.includes(wanted) ? wanted : BASE_CURRENCY;
}

const LOCALE_FOR_FORMAT: Record<string, string> = { fr: "fr-FR", en: "en-GB" };

/**
 * §6: DRC conventions — space thousands separator, comma decimal — come free
 * from Intl with fr-FR. The number is always Intl's; only the franc sign is
 * ours (below).
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
  const options = { minimumFractionDigits: fraction, maximumFractionDigits: fraction };
  const tag = LOCALE_FOR_FORMAT[locale] ?? "fr-FR";
  // Francs are written "28 500 FC" ("28,500 FC" in English), as in Kinshasa —
  // not Intl's "28 500 CDF" / "CDF 28,500".
  if (currency === "CDF") return `${new Intl.NumberFormat(tag, options).format(minor)}\u00a0FC`;
  return new Intl.NumberFormat(tag, { style: "currency", currency, ...options }).format(
    minor / 10 ** digits
  );
}

/** Resolve then format — the pairing behind nearly every price on the site. */
export function price(
  money: Money | number | undefined,
  currency: Currency,
  locale = "fr"
): string {
  const shown = resolve(money, currency);
  return formatMoney(shown.minor, shown.currency, locale);
}

/**
 * §5: "You will be charged 10 $ (28 500 FC)". Ambiguity about the
 * settlement currency generates disputes, and disputes are expensive when
 * there is no refund path to defuse them. Nothing to add when the figure is
 * shown in francs: that is the charge.
 */
export function settlementNote(
  money: Money | number | undefined,
  currency: Currency,
  locale = "fr"
): string | null {
  const shown = resolve(money, currency);
  if (shown.currency === BASE_CURRENCY) return null;
  return `${formatMoney(shown.minor, shown.currency, locale)} (${formatMoney(
    baseMinor(money),
    BASE_CURRENCY,
    locale
  )})`;
}

/** Multiply a whole Money by a quantity — every currency scales together. */
export function multiply(money: Money | number | undefined, factor: number): Money {
  if (typeof money === "number") return { CDF: money * factor };
  const out: Money = {};
  for (const [c, v] of Object.entries(money ?? {})) {
    if (typeof v === "number") out[c as Currency] = Math.round(v * factor);
  }
  return out.CDF === undefined ? { ...out, CDF: 0 } : out;
}

export function nightsBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}
