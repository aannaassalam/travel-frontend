import {
  Enquiry,
  EnquiryKind,
  Vertical
} from "@/typescript/interface/domain.interface";

/**
 * Browser-side persistence for orders, enquiries, saved items and the signed-in
 * customer.
 *
 * Orders and enquiries are now server-owned: `POST /orders`, `POST /enquiries`
 * and `GET /orders/:reference` all exist, so what remains here is the small set
 * of things that are genuinely per-device — which references this browser
 * booked, saved slugs, recent searches, and the guest session.
 *
 * ponytail: `GET /me/orders` still does not exist, so "my bookings" is the
 * locally-remembered reference list resolved against the API one call at a
 * time. That is correct but device-bound: the same customer on a new phone sees
 * nothing. Replace `getOrderRefs` with an authenticated list endpoint when
 * customer login lands. Nothing sensitive is written here: no tokens (§7.3
 * forbids localStorage for those), no document numbers.
 */

const KEYS = {
  orders: "ct.orders",
  enquiries: "ct.enquiries",
  saved: "ct.saved",
  user: "ct.user"
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("ct:store", { detail: key }));
  } catch {
    /* quota or private mode — the UI still works, it just will not remember */
  }
}

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * §10.3(4): public references are unguessable. Sequential ids invite someone to
 * try ORD-1001, ORD-1002 and walk the whole order table.
 */
export function makeReference(prefix: "CT" | "DM" = "CT"): string {
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += B32[Math.floor(Math.random() * B32.length)];
  }
  return `${prefix}-${out.slice(0, 5)}-${out.slice(5)}`;
}

/* --------------------------------------------------------------------- user */

export interface SessionUser {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  /** §2.1 deferred account creation: a guest checkout lands here. */
  state: "UNCLAIMED" | "ACTIVE";
}

export const getUser = () => read<SessionUser | null>(KEYS.user, null);
export const setUser = (u: SessionUser | null) => write(KEYS.user, u);

/* ------------------------------------------------------------------- orders */

/**
 * Only the REFERENCES live here. The orders themselves come from
 * `GET /api/v1/orders/:reference` on every read.
 *
 * Caching the order body locally would show a customer a status the office has
 * since changed — cash marked received, documents issued, a cancellation — and
 * they would believe the stale copy. The reference is the read capability, so
 * this list is exactly "which orders did this device book", nothing more.
 */
export const getOrderRefs = () => read<string[]>(KEYS.orders, []);

export function rememberOrderRef(reference: string) {
  const all = getOrderRefs().filter((r) => r !== reference);
  write(KEYS.orders, [reference, ...all].slice(0, 50));
}

/* ---------------------------------------------------------------- enquiries */

export const getEnquiries = () => read<Enquiry[]>(KEYS.enquiries, []);

export function saveEnquiry(input: {
  /** Assigned by the server so the customer and the admin quote the same one. */
  reference: string;
  kind: EnquiryKind;
  vertical: Vertical;
  customerName: string;
  phone: string;
  email?: string;
  message: string;
  listingLabel?: string;
}): Enquiry {
  const enquiry: Enquiry = {
    stage: "NEW",
    createdAt: new Date().toISOString(),
    ...input
  };
  write(KEYS.enquiries, [enquiry, ...getEnquiries()]);
  return enquiry;
}

/* ---------------------------------------------------------- recent searches */

export interface RecentSearch {
  vertical: Vertical;
  label: string;
  href: string;
  at: string;
}

const RECENT_KEY = "ct.recent";

export const getRecentSearches = () => read<RecentSearch[]>(RECENT_KEY, []);

/**
 * Remembering the last few searches is worth more here than on a typical
 * marketplace: stock is thin, so people re-run the same route for days waiting
 * for it to appear. Deduplicated by href and capped at five.
 */
export function pushRecentSearch(entry: Omit<RecentSearch, "at">) {
  if (!entry.label.trim()) return;
  const next = [
    { ...entry, at: new Date().toISOString() },
    ...getRecentSearches().filter((r) => r.href !== entry.href)
  ].slice(0, 5);
  write(RECENT_KEY, next);
}

export function clearRecentSearches() {
  write(RECENT_KEY, []);
}

/* ---------------------------------------------------------- recently viewed */

const VIEWED_KEY = "ct.viewed";

export const getRecentlyViewed = () => read<string[]>(VIEWED_KEY, []);

/** Slugs only — resolved against the live catalogue so prices are never stale. */
export function pushRecentlyViewed(slug: string) {
  write(VIEWED_KEY, [slug, ...getRecentlyViewed().filter((s) => s !== slug)].slice(0, 8));
}

/* -------------------------------------------------------------------- saved */

export const getSaved = () => read<string[]>(KEYS.saved, []);

export function toggleSaved(slug: string): boolean {
  const all = getSaved();
  const next = all.includes(slug)
    ? all.filter((s) => s !== slug)
    : [slug, ...all];
  write(KEYS.saved, next);
  return next.includes(slug);
}
