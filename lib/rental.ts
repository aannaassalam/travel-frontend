import type {
  Currency,
  Listing,
  Money,
  RentalRate
} from "@/typescript/interface/domain.interface";

/**
 * Car hire by the hour.
 *
 * A car rents at up to four prices — per hour, for 6, 12 and 24 hours (the
 * 24-hour one is its `sellPrice`) — and a booking pays the cheapest mix of them
 * that covers the hours from pick-up to return: 30 hours is 24 + 6. The server
 * prices it again with the same `planBlocks` (rental.service.ts); this copy
 * only says on screen what it will charge.
 *
 * Times are "YYYY-MM-DDTHH:MM" on the wall clock, with no zone, like a bus
 * departure. Type imports only, so node can run this file as it is for the
 * cross-check against the server's copy.
 */

/** rates: offered rates only (base > 0), any order. hours: integer >= 1. */
export function planBlocks(
  rates: { hours: number; base: number }[],
  hours: number
): { hours: number; count: number }[] {
  const desc = [...rates].filter((r) => r.base > 0 && r.hours > 0).sort((a, b) => b.hours - a.hours);
  if (!desc.length || !(hours >= 1)) return [];
  const best = new Array<number>(hours + 1).fill(Infinity);
  const pick = new Array<number>(hours + 1).fill(-1);
  best[0] = 0;
  for (let h = 1; h <= hours; h++) {
    for (let i = 0; i < desc.length; i++) {
      const c = best[Math.max(0, h - desc[i].hours)] + desc[i].base;
      if (c < best[h]) { best[h] = c; pick[h] = i; } // strict: a tie keeps the longer block
    }
  }
  const counts = new Map<number, number>();
  for (let h = hours; h > 0; ) {
    const r = desc[pick[h]];
    counts.set(r.hours, (counts.get(r.hours) ?? 0) + 1);
    h = Math.max(0, h - r.hours);
  }
  return desc.filter((r) => counts.has(r.hours)).map((r) => ({ hours: r.hours, count: counts.get(r.hours)! }));
}

/**
 * A car's offered rates, shortest first, each with its own promotion. A
 * response from before hourly hire (a cached page) has no `rentalRates`: it
 * rents by the 24 hours alone. In one from before a promotion per rate, the
 * 24-hour rate's is the listing's `promotion`.
 */
export const ratesOf = (l: Pick<Listing, "rentalRates" | "sellPrice" | "promotion">): RentalRate[] =>
  l.rentalRates?.length
    ? l.rentalRates.map((r) => (r.hours === 24 && !r.promotion ? { ...r, promotion: l.promotion } : r))
    : (l.sellPrice?.CDF ?? 0) > 0
      ? [{ hours: 24, price: l.sellPrice, promotion: l.promotion }]
      : [];

/** One part of a hire's price: `count` times the `hours` rate, `price` being the lot. */
export interface RentalBlock {
  hours: number;
  count: number;
  price: Money;
}

/**
 * What `hours` of hire cost: the cheapest mix's blocks, and the total. Each
 * currency is scaled and added on its own — a dollar total is the dollar
 * prices shown, added up — and one that any block lacks is left out, as the
 * server does. The mix itself is chosen on the francs, the base.
 */
export function rentalPrice(
  rates: RentalRate[],
  hours: number
): { blocks: RentalBlock[]; total: Money } {
  const plan = planBlocks(rates.map((r) => ({ hours: r.hours, base: r.price.CDF ?? 0 })), hours);
  const blocks = plan.map(({ hours: h, count }) => {
    const price: Money = {};
    for (const [c, v] of Object.entries(rates.find((r) => r.hours === h)!.price)) {
      if (typeof v === "number") price[c as Currency] = v * count;
    }
    return { hours: h, count, price };
  });
  const total: Money = {};
  for (const c of Object.keys(blocks[0]?.price ?? {}) as Currency[]) {
    if (blocks.every((b) => typeof b.price[c] === "number")) {
      total[c] = blocks.reduce((s, b) => s + (b.price[c] ?? 0), 0);
    }
  }
  return { blocks, total };
}

const HOUR_MS = 3_600_000;

/** The longest hire the server takes: 365 days. */
export const MAX_RENTAL_HOURS = 8760;

/** Whole hours from one "YYYY-MM-DDTHH:MM" to another, rounded up. Read as written: no zone. */
export const hoursBetween = (from: string, to: string) =>
  Math.ceil((Date.parse(`${to}Z`) - Date.parse(`${from}Z`)) / HOUR_MS);

/** A "YYYY-MM-DDTHH:MM" moved by whole hours on the same wall clock — across midnight too. */
export const addHours = (at: string, n: number) =>
  new Date(Date.parse(`${at}Z`) + n * HOUR_MS).toISOString().slice(0, 16);

/**
 * The next full hour: an hour already begun is not offered. Read on this
 * device's clock, or on Kinshasa's (UTC+1, no summer time) when that is later
 * — the server judges "already begun" there, so a phone abroad or set behind
 * must not be offered an hour it will refuse.
 */
export const nextFullHour = (now = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  const device = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:00`;
  const kinshasa = `${new Date(now.getTime() + HOUR_MS).toISOString().slice(0, 13)}:00`;
  return addHours(device > kinshasa ? device : kinshasa, 1);
};

/**
 * A pick-up and a length, made bookable: the pick-up no earlier than `min`, the
 * return 1 hour to 365 days after it. Every change goes through here, so an
 * impossible pair never reaches the screen.
 */
export function fitRental(min: string, start: string, hours: number) {
  const from = start < min ? min : start;
  return { start: from, end: addHours(from, Math.min(MAX_RENTAL_HOURS, Math.max(1, hours))) };
}

/** The whole hours "HH:00" of `day` that lie between two "YYYY-MM-DDTHH:MM" bounds. */
export const hoursOn = (day: string, min: string, max?: string) =>
  Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`).filter(
    (hh) => `${day}T${hh}` >= min && (!max || `${day}T${hh}` <= max)
  );

type T = (key: string, vars?: Record<string, string | number>) => string;

/** "Par heure", "Pour 6 heures" … — a rate by its length, on cards and in the booking box alike. */
export const rateLabel = (hours: number, t: T) =>
  hours === 1 ? t("rental.perHour") : t("rental.hours", { n: hours });

/** "8 h", "1 jour 6 h", "3 jours". */
export const durationLabel = (hours: number, t: T) => {
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return [days ? `${days} ${t(days > 1 ? "common.days" : "common.day")}` : "", rest ? `${rest} h` : ""]
    .filter(Boolean)
    .join(" ");
};
