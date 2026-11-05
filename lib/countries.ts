import {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  parsePhoneNumber
} from "react-phone-number-input/input";
import names from "react-phone-number-input/locale/en.json";

/**
 * Dialling codes offered by the phone field.
 *
 * The DRC, its neighbours, the diaspora destinations customers call from and
 * the hubs the flights connect through come first — the quick picks. Every
 * other country follows, A to Z: with only those 24, a customer whose number
 * was from anywhere else (an account made in the app or by the office) saw it
 * prefilled under DR Congo, its dialling code left inside the number.
 *
 * `digits` is how many national digits the number has AFTER any trunk zero, so
 * the field can tell someone their number is short before the SMS is wasted.
 * The rest of the world is checked with the phone library's own rules instead.
 */
export interface Country {
  /** ISO 3166-1 alpha-2, used as the stable option value. */
  code: string;
  name: string;
  /** Dialling prefix, with the plus. */
  dial: string;
  flag: string;
  digits?: [number, number];
  /** One of the quick picks at the top of the list. */
  preferred?: boolean;
}

const PREFERRED: Country[] = ([
  { code: "CD", name: "RD Congo", dial: "+243", flag: "\u{1F1E8}\u{1F1E9}", digits: [9, 9] },
  { code: "CG", name: "Congo-Brazzaville", dial: "+242", flag: "\u{1F1E8}\u{1F1EC}", digits: [9, 9] },
  { code: "AO", name: "Angola", dial: "+244", flag: "\u{1F1E6}\u{1F1F4}", digits: [9, 9] },
  { code: "RW", name: "Rwanda", dial: "+250", flag: "\u{1F1F7}\u{1F1FC}", digits: [9, 9] },
  { code: "BI", name: "Burundi", dial: "+257", flag: "\u{1F1E7}\u{1F1EE}", digits: [8, 8] },
  { code: "UG", name: "Uganda", dial: "+256", flag: "\u{1F1FA}\u{1F1EC}", digits: [9, 9] },
  { code: "TZ", name: "Tanzania", dial: "+255", flag: "\u{1F1F9}\u{1F1FF}", digits: [9, 9] },
  { code: "KE", name: "Kenya", dial: "+254", flag: "\u{1F1F0}\u{1F1EA}", digits: [9, 9] },
  { code: "ZM", name: "Zambia", dial: "+260", flag: "\u{1F1FF}\u{1F1F2}", digits: [9, 9] },
  { code: "CF", name: "Centrafrique", dial: "+236", flag: "\u{1F1E8}\u{1F1EB}", digits: [8, 8] },
  { code: "SS", name: "South Sudan", dial: "+211", flag: "\u{1F1F8}\u{1F1F8}", digits: [9, 9] },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "\u{1F1FF}\u{1F1E6}", digits: [9, 9] },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "\u{1F1F3}\u{1F1EC}", digits: [10, 10] },
  { code: "CM", name: "Cameroun", dial: "+237", flag: "\u{1F1E8}\u{1F1F2}", digits: [9, 9] },
  { code: "BE", name: "Belgique", dial: "+32", flag: "\u{1F1E7}\u{1F1EA}", digits: [9, 9] },
  { code: "FR", name: "France", dial: "+33", flag: "\u{1F1EB}\u{1F1F7}", digits: [9, 9] },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "\u{1F1EC}\u{1F1E7}", digits: [10, 10] },
  { code: "US", name: "United States", dial: "+1", flag: "\u{1F1FA}\u{1F1F8}", digits: [10, 10] },
  { code: "CA", name: "Canada", dial: "+1", flag: "\u{1F1E8}\u{1F1E6}", digits: [10, 10] },
  { code: "AE", name: "UAE", dial: "+971", flag: "\u{1F1E6}\u{1F1EA}", digits: [9, 9] },
  { code: "IN", name: "India", dial: "+91", flag: "\u{1F1EE}\u{1F1F3}", digits: [10, 10] },
  { code: "CN", name: "China", dial: "+86", flag: "\u{1F1E8}\u{1F1F3}", digits: [11, 11] },
  { code: "TR", name: "Türkiye", dial: "+90", flag: "\u{1F1F9}\u{1F1F7}", digits: [10, 10] },
] as Country[]).map((c) => ({ ...c, preferred: true }));

/** A flag from the two letters of its code (regional indicator symbols). */
const flagOf = (code: string) =>
  String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

const quick = new Set(PREFERRED.map((c) => c.code));

export const COUNTRIES: Country[] = [
  ...PREFERRED,
  ...getCountries()
    .filter((code) => !quick.has(code))
    .map((code) => ({
      code,
      name: (names as Record<string, string>)[code] ?? code,
      dial: `+${getCountryCallingCode(code)}`,
      flag: flagOf(code)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
];

/** The office is in Kinshasa, so this is the overwhelmingly common case. */
export const DEFAULT_COUNTRY = COUNTRIES[0];

export const findCountry = (code: string) =>
  COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;

/**
 * Builds E.164 from a country and the national part.
 *
 * The leading trunk zero is stripped: people write their own number the way
 * they dial it locally ("081..."), and pasting that after a dial code produces
 * a number that does not exist.
 */
export function toE164(country: Country, national: string): string | null {
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  const e164 = `${country.dial}${digits}`;
  if (country.digits) {
    const [min, max] = country.digits;
    return digits.length < min || digits.length > max ? null : e164;
  }
  return digits && isPossiblePhoneNumber(e164) ? e164 : null;
}

/** Longest prefix first, so +1 never wins over a +1xx style code. */
const BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/**
 * The country a full number belongs to. The phone library reads it from the
 * number itself — so +1 416… is Canada and +1 876… Jamaica, not "the first +1"
 * — and the longest matching dialling code is the fallback.
 */
const countryOf = (e164: string): Country | undefined => {
  try {
    const code = parsePhoneNumber(e164)?.country;
    if (code) return findCountry(code);
  } catch {
    /* not a number the library can read: by its dialling code */
  }
  return BY_DIAL_LENGTH.find((c) => e164.startsWith(c.dial));
};

/** Splits a stored E.164 back into a country and its national part. */
export function fromE164(value?: string | null): { country: Country; national: string } {
  if (!value?.startsWith("+")) return { country: DEFAULT_COUNTRY, national: "" };
  const compact = value.replace(/[^\d+]/g, "");
  const match = countryOf(compact);
  if (!match) return { country: DEFAULT_COUNTRY, national: compact.replace(/^\+/, "") };
  return { country: match, national: compact.slice(match.dial.length) };
}

/**
 * Normalises whatever lands in the national box.
 *
 * Nobody types their number the way the field wants it. They paste
 * "+243 81 000 00 00" from WhatsApp, and the browser autofills `tel-national`
 * with the full international number it has on file — in both cases the dial
 * code used to be stripped of its plus and left sitting in the national part,
 * so the number failed the length check under whichever country happened to be
 * selected, which is not the one the number belongs to.
 *
 * A value only counts as international when it carries a plus, or when it is
 * longer than the selected country allows AND opens with a dial code we know:
 * a local number typed with its trunk zero must never reselect the country.
 */
export function splitNational(
  value: string,
  current: Country
): { country: Country; national: string } {
  const digits = value.replace(/\D/g, "");
  // Countries without a curated length: longer than any national number is.
  const longest = current.digits?.[1] ?? 12;
  const international = value.trim().startsWith("+") || digits.length > longest;
  if (international) {
    const match = countryOf(`+${digits}`);
    if (match) return { country: match, national: digits.slice(match.dial.length - 1) };
  }
  return { country: current, national: digits };
}
