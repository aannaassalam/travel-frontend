import { Locale } from "@/typescript/interface/domain.interface";

/**
 * §6 formatting. Everything goes through Intl — DRC conventions (DD/MM/YYYY,
 * space thousands separator, comma decimal) come free from fr-FR.
 *
 * §8: timestamps are ISO 8601 with offset. DRC spans UTC+1 and UTC+2, so a
 * naive local time is a wrong time for half the country.
 */

const tag = (locale: Locale) => (locale === "en" ? "en-GB" : "fr-FR");

export const fmtDate = (iso: string, locale: Locale = "fr") =>
  new Intl.DateTimeFormat(tag(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(iso));

export const fmtDateLong = (iso: string, locale: Locale = "fr") =>
  new Intl.DateTimeFormat(tag(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(iso));

export const fmtTime = (iso: string, locale: Locale = "fr") =>
  new Intl.DateTimeFormat(tag(locale), {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));

export const fmtDateTime = (iso: string, locale: Locale = "fr") =>
  `${fmtDate(iso, locale)} · ${fmtTime(iso, locale)}`;

/** "2 h 35" / "2h 35m" from two ISO instants. */
export function durationBetween(from: string, to: string, locale: Locale = "fr") {
  return formatMinutes(
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000),
    locale
  );
}

export function formatMinutes(total: number, locale: Locale = "fr") {
  const days = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (days) parts.push(locale === "fr" ? `${days} j` : `${days}d`);
  if (h) parts.push(locale === "fr" ? `${h} h` : `${h}h`);
  if (m) parts.push(locale === "fr" ? `${m} min` : `${m}m`);
  return parts.join(" ") || (locale === "fr" ? "0 min" : "0m");
}

/**
 * E.164 now comes from `lib/countries.toE164`, which takes the country as an
 * explicit choice. The helper that used to live here assumed +243 for anything
 * without a plus - correct for most customers, silently wrong for the rest, and
 * the reason a diaspora number could be saved as a Congolese one.
 */

/** §10.7: never log or display a full number where a partial will do. */
export const maskPhone = (e164: string) =>
  e164.length > 4 ? `${"•".repeat(e164.length - 3)}${e164.slice(-3)}` : e164;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
