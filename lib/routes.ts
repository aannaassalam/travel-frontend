import {
  Listing,
  ListingAttributes,
  Locale,
  Money,
  Passengers
} from "@/typescript/interface/domain.interface";
import { multiply } from "./money";

/**
 * Bus and flight routes.
 *
 * A route is not one dated departure but a timetable: a bus leaves at the same
 * times every day (`dailyTimes`), a flight at set times on set days of the week
 * (`weeklyTimes`). The customer picks the date and one of that day's times;
 * the server checks the pair against the same timetable (schedule.service).
 *
 * Times are the agency's wall-clock "HH:MM", with no zone, and a date is a
 * plain "YYYY-MM-DD".
 */

export const isRoute = (l: Pick<Listing, "vertical">) =>
  l.vertical === "BUS" || l.vertical === "FLIGHT";

/** The day of the week of a YYYY-MM-DD, as written: 0 = Sunday. */
export const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();

/** Today as YYYY-MM-DD on this device's calendar. */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** That date's departure times, earliest first. */
export const timesOn = (a: ListingAttributes | undefined, day: string): string[] => {
  const wd = weekdayOf(day);
  return [
    ...new Set([
      ...(a?.dailyTimes ?? []),
      ...(a?.weeklyTimes ?? []).filter((w) => w.day === wd).map((w) => w.time)
    ])
  ].sort();
};

/**
 * The times still to come on that date: all of them on a later day, only those
 * after now today. (Judged on this device's clock — the server judges again.)
 */
export const bookableTimesOn = (a: ListingAttributes | undefined, day: string) => {
  const today = todayIso();
  if (day < today) return [];
  const all = timesOn(a, day);
  if (day > today) return all;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return all.filter((t) => t > hhmm);
};

/** The first day from `from` with a departure still to come, within a fortnight. */
export const nextDayWithDepartures = (a: ListingAttributes | undefined, from: string) => {
  for (let n = 0; n < 15; n++) {
    const day = addDays(from, n);
    if (bookableTimesOn(a, day).length) return day;
  }
  return undefined;
};

/** "HH:MM" plus a duration, as "HH:MM" — with "+1" when it lands the next day. */
export const arrivalOf = (time: string, minutes?: number) => {
  if (!minutes) return undefined;
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const days = Math.floor(total / 1440);
  const at = `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return days ? `${at} (+${days})` : at;
};

const DAY_NAMES: Record<Locale, string[]> = {
  fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
};

export const dayName = (day: number, locale: Locale) => (DAY_NAMES[locale] ?? DAY_NAMES.fr)[day];

/** Monday first, as a timetable is read. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "Tous les jours : 06:30, 14:00" or "Lun 08:00 · Mer 15:45". */
export const timetableSummary = (a: ListingAttributes | undefined, locale: Locale) => {
  const daily = a?.dailyTimes ?? [];
  const weekly = [...(a?.weeklyTimes ?? [])].sort(
    (x, y) => WEEK_ORDER.indexOf(x.day) - WEEK_ORDER.indexOf(y.day) || x.time.localeCompare(y.time)
  );
  return [
    daily.length ? `${locale === "fr" ? "Tous les jours" : "Every day"} : ${daily.join(", ")}` : "",
    ...weekly.map((w) => `${dayName(w.day, locale)} ${w.time}`)
  ]
    .filter(Boolean)
    .join(" · ");
};

export interface Fares {
  adult: Money;
  child: Money;
  infant: Money;
}

export const faresOf = (l: Listing): Fares => ({
  adult: l.sellPrice,
  child: l.childPrice ?? l.sellPrice,
  infant: l.infantPrice ?? { USD: 0 }
});

/** Each fare times its passengers, added up currency by currency. */
export const routeTotal = (fares: Fares, p: Passengers): Money => {
  const parts = [
    multiply(fares.adult, p.adults),
    multiply(fares.child, p.children),
    multiply(fares.infant, p.infants)
  ];
  const out: Money = {};
  for (const c of Object.keys(parts[0]) as (keyof Money)[]) {
    if (parts.every((m) => typeof m[c] === "number")) {
      out[c] = parts.reduce((s, m) => s + (m[c] ?? 0), 0);
    }
  }
  return out;
};

export const passengerCount = (p: Passengers) => p.adults + p.children + p.infants;
