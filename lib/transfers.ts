import {
  Locale,
  Localized,
  Money,
  Ride,
  RideStatus,
  TransferMode,
  TransferPoint
} from "@/typescript/interface/domain.interface";
import { get, post } from "./api";
import { fmtDate } from "./format";
import { localized } from "./i18n";

/**
 * Transfers: a ride with a driver from A to B, or a driver by the hour.
 *
 * Mirrors travel-backend's public `/transfers` routes and the `ride` block a
 * TRANSFER order item carries. Nothing is priced here — the quote is the
 * server's, in francs rounded up to the next 100 FC, and the order is quoted
 * again when it is created (`transfer` on the order item, never a price).
 */

/* ------------------------------------------------------------------ places */

export type PlaceKind = "AIRPORT" | "HOTEL" | "STATION" | "PORT" | "LANDMARK" | "OTHER";

/** One of the office's saved points — or, `external`, a geocoding suggestion. */
export interface TransferPlace {
  id?: string;
  name: Localized | string;
  kind?: PlaceKind;
  lat: number;
  lng: number;
  external?: boolean;
}

/** Office places of the city matching `q` (all of them when empty), plus search results. */
export const getTransferPlaces = (city: string, q?: string, init?: RequestInit) =>
  get<{ items: TransferPlace[] }>(
    `/transfers/places?city=${encodeURIComponent(city)}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    init
  ).then((r) => r.items);

/* -------------------------------------------------------------- categories */

/** Public view of a vehicle category: what the office pays is never here. */
export interface TransferCategory {
  id: string;
  name: Localized | string;
  description?: Localized | string;
  image?: string;
  seats: number;
  luggage?: string;
  pricePerKm: Money;
  pricePerHour: Money;
  minimumFare?: Money;
}

export const getTransferCategories = (city: string, init?: RequestInit) =>
  get<{ items: TransferCategory[] }>(
    `/transfers/categories?city=${encodeURIComponent(city)}`,
    init
  ).then((r) => r.items);

/* ------------------------------------------------------------------- quote */

export interface TransferQuoteRequest {
  city: string;
  mode: TransferMode;
  pickup: TransferPoint;
  /** Required for a journey; an hourly hire has none. */
  dropoff?: TransferPoint;
  /** "YYYY-MM-DDTHH:MM", the office's wall clock, as written. */
  at: string;
  hours?: number;
  passengers: number;
  categoryId?: string;
}

/** What goes on the order item: the quote request, the category, the note. */
export interface TransferRequest extends TransferQuoteRequest {
  categoryId: string;
  notes?: string;
}

export interface TransferQuote {
  distanceKm: number;
  durationMinutes: number;
  /** ESTIMATE when the road router was unreachable: straight line × detour factor. */
  routeSource: "ROUTING" | "ESTIMATE";
  /** GeoJSON order, [lng, lat]. */
  route?: [number, number][];
  quotes: {
    categoryId: string;
    name: Localized | string;
    seats: number;
    price: Money;
    /** False when the category seats fewer than the passengers. */
    available: boolean;
  }[];
}

/** POST /transfers/quote — every active category priced at once, to compare. */
export const quoteTransfer = (body: TransferQuoteRequest) =>
  post<TransferQuote>("/transfers/quote", body);

/* --------------------------------------------------------- after the ride */

export const MAX_RIDE_COMMENT = 500;

/** POST /orders/:reference/transfer/rate — once, after the ride. */
export const rateRide = (reference: string, body: { score: number; comment?: string }) =>
  post<unknown>(`/orders/${encodeURIComponent(reference)}/transfer/rate`, body);

/**
 * POST /orders/:reference/transfer/alert — a security alert to the office,
 * with the position when the browser gave one. Works for a guest holding the
 * reference: nobody in trouble should be asked to sign in first. The office's
 * alert number comes back, so the screen can offer the call.
 */
export const alertRide = (
  reference: string,
  body: { lat?: number; lng?: number; note?: string }
) =>
  post<{ sent: boolean; officePhone?: string }>(
    `/orders/${encodeURIComponent(reference)}/transfer/alert`,
    body
  );

/* ----------------------------------------------------------------- helpers */

/**
 * The codes the server answers when it will not quote or book a ride as asked
 * (transfers/quote.service). Every one means "change something on the form";
 * the time and the two points get their own sentence, the rest share one.
 */
export const TRANSFER_REFUSALS = new Set([
  "TRANSFER_ALONE",
  "TRANSFER_QUANTITY",
  "TRANSFER_REQUIRED",
  "CITY_REQUIRED",
  "CITY_NOT_SERVED",
  "INVALID_MODE",
  "POINT_REQUIRED",
  "INVALID_POINT",
  "SAME_POINTS",
  "INVALID_TIME",
  "INVALID_HOURS",
  "INVALID_PASSENGERS",
  "INVALID_CATEGORY",
  "CATEGORY_REQUIRED",
  "CATEGORY_UNAVAILABLE",
  "TOO_MANY_PASSENGERS"
]);

/** The category chosen no longer fits, or is gone: pick another card. */
const CATEGORY_REFUSALS = new Set([
  "CATEGORY_UNAVAILABLE",
  "TOO_MANY_PASSENGERS",
  "INVALID_CATEGORY",
  "CATEGORY_REQUIRED"
]);

/** The i18n key that explains a refusal, or nothing for a code that is not one. */
export const transferRefusalKey = (code?: string): string | undefined =>
  code === "INVALID_TIME"
    ? "transfer.errTime"
    : code === "SAME_POINTS"
      ? "transfer.errSamePoints"
      : code && CATEGORY_REFUSALS.has(code)
        ? "transfer.errCategory"
        : code && TRANSFER_REFUSALS.has(code)
          ? "transfer.errQuote"
          : undefined;

/** A name that may be stored per locale (the office's) or plain (a search hit). */
export const placeText = (v: Localized | string | undefined, locale: Locale) =>
  typeof v === "string" ? v : localized(v, locale);

/** The server refuses a point outside this box; saying so first saves a round trip. */
export const inDrc = (p: { lat: number; lng: number }) =>
  p.lat >= -14 && p.lat <= 6 && p.lng >= 12 && p.lng <= 32;

/** Kinshasa centre: the map's view before any point is set in an unknown city. */
export const KINSHASA = { lat: -4.325, lng: 15.3222 };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The earliest bookable moment: now in Kinshasa (UTC+1, which is what the
 * server judges by) plus 30 minutes, rounded up to the next quarter hour. The
 * device's own zone never enters: a visitor abroad books on the office's clock.
 */
export function minBookableAt(): { date: string; time: string } {
  const d = new Date(Date.now() + 60 * 60_000 + 30 * 60_000);
  d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 15) * 15, 0, 0);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  };
}

/** Bookings are taken up to 90 days ahead. */
export function maxBookableDate(): string {
  const d = new Date(Date.now() + 90 * 86400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Every quarter hour of a day, "HH:MM". */
export const TIME_SLOTS = Array.from({ length: 96 }, (_, i) =>
  `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`
);

/** The slots still bookable on `date`: all of them on a later day, none on a past one. */
export function slotsOn(date: string, min: { date: string; time: string }): string[] {
  if (date < min.date) return [];
  if (date > min.date) return TIME_SLOTS;
  return TIME_SLOTS.filter((t) => t >= min.time);
}

export const isoAt = (date: string, time: string) => `${date}T${time}`;

/**
 * "03 nov. 2026 · 08:30" from a wall-clock instant, as written — the day and
 * time are the office's, never this device's zone. Takes the short form the
 * form builds and the full ISO the API stores alike.
 */
export const fmtAt = (at: string, locale: Locale) =>
  `${fmtDate(`${at.slice(0, 10)}T12:00:00`, locale)} · ${at.slice(11, 16)}`;

/** Kilometres with one decimal, the way the server rounds them. */
export const fmtKm = (km: number, locale: Locale) =>
  `${km.toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })} km`;

/** GeoJSON [lng, lat] pairs → Leaflet [lat, lng]. */
export const routeLatLng = (route?: [number, number][]): [number, number][] =>
  (route ?? []).map(([lng, lat]) => [lat, lng]);

/** Google Maps directions between the two points, or the one point for an hourly hire. */
export const directionsLink = (
  from: { lat: number; lng: number },
  to?: { lat: number; lng: number }
) =>
  to
    ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${from.lat},${from.lng}`;

/** How long after the ride the alert button stays: the drive home from the drop-off. */
const ALERT_AFTER_MS = 2 * 60 * 60_000;

/**
 * The alert is offered from the moment a driver is named until two hours after
 * the end. The server says so itself when it can (its clock is the one that
 * decides); the same rule is applied here for a DTO that does not.
 */
export function canAlert(ride: Pick<Ride, "status" | "endedAt" | "canAlert">): boolean {
  if (typeof ride.canAlert === "boolean") return ride.canAlert;
  if (ride.status === "ASSIGNED" || ride.status === "STARTED") return true;
  if (ride.status !== "COMPLETED" || !ride.endedAt) return false;
  return Date.now() - new Date(ride.endedAt).getTime() <= ALERT_AFTER_MS;
}

export const RIDE_TONE: Record<RideStatus, string> = {
  PENDING: "bg-warn-100 text-warn-600",
  ASSIGNED: "bg-brand-50 text-brand-700",
  STARTED: "bg-ok-100 text-ok-600",
  COMPLETED: "bg-ink-100 text-ink-700",
  CANCELLED: "bg-bad-100 text-bad-600"
};

/** Eight seconds is about what a phone needs for a first fix outdoors. */
const LOCATE_TIMEOUT_MS = 8000;
/** The API's timeout does not run while its permission prompt is open: see `locate`. */
export const LOCATE_HARD_STOP_MS = 12_000;

/**
 * The browser's position, or nothing: an alert must go out whether or not the
 * visitor allows it, and a prompt that hangs must not hold the message. The
 * API's own timeout only covers the fix, not the permission prompt — and a
 * prompt closed without an answer (Firefox) calls neither callback — so a hard
 * stop sits over it.
 */
export function locate(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(undefined);
    const stop = setTimeout(() => resolve(undefined), LOCATE_HARD_STOP_MS);
    const done = (p?: { lat: number; lng: number }) => {
      clearTimeout(stop);
      resolve(p);
    };
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => done({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => done(undefined),
        { timeout: LOCATE_TIMEOUT_MS, maximumAge: 60_000 }
      );
    } catch {
      // A browser that throws instead of calling back must not hang the alert.
      done(undefined);
    }
  });
}
