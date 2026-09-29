import {
  Hotel,
  Listing,
  Locale,
  Order,
  Restaurant,
  Vertical
} from "@/typescript/interface/domain.interface";

/**
 * The public catalogue client.
 *
 * Every function here maps to one route on travel-backend's `/api/v1` surface.
 * There is no local copy of the catalogue any more — the API is the single
 * source of truth, which is the whole point of building it.
 *
 * `fetch` rather than the axios instance in /api: these calls run in three
 * places (browser, `getStaticProps` at build time, ISR revalidation on the
 * server) and fetch is the only client that behaves identically in all three.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3001/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /**
     * Machine-readable reason from the API. Callers switch on this, never on
     * the human-readable message (§8) — the message is translated and rewritten,
     * the code is a contract.
     */
    readonly code?: string
  ) {
    super(message);
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    // The session is an httpOnly cookie (§7.3 forbids localStorage for tokens),
    // so it only travels if credentials are sent.
    credentials: "include",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) }
  });
  if (!res.ok) {
    // §8: clients switch on status and the machine-readable code, never on the
    // human-readable detail.
    throw new ApiError(res.headers.get("X-Message") ?? res.statusText, res.status);
  }
  return (await res.json()) as T;
}

/** Drops empty values so the URL only carries params that mean something. */
const qs = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
};

/** §8: the allow-list the client is permitted to build. No filter DSL. */
export interface SearchQuery {
  vertical?: Vertical;
  city?: string;
  origin?: string;
  destination?: string;
  cabin?: string;
  tripType?: string;
  propertyType?: string;
  operator?: string;
  category?: string;
  transmission?: string;
  withDriver?: string;
  stars?: string;
  amenities?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  sort?: string;
  from?: string;
  to?: string;
  adults?: number;
  limit?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
}

/** GET /listings */
export const searchListings = (q: SearchQuery, init?: RequestInit) =>
  get<Paged<Listing>>(`/listings${qs(q as never)}`, init);

/** GET /listings/:slug */
export const getListing = (slug: string, init?: RequestInit) =>
  get<{ listing: Listing; related: Listing[] }>(
    `/listings/${encodeURIComponent(slug)}`,
    init
  );

/** GET /hotels */
export const searchHotels = (q: SearchQuery, init?: RequestInit) =>
  get<Paged<Hotel>>(`/hotels${qs(q as never)}`, init);

/** GET /hotels/:slug */
export const getHotel = (slug: string, from?: string, to?: string, init?: RequestInit) =>
  get<{ hotel: Hotel; others: Hotel[] }>(
    `/hotels/${encodeURIComponent(slug)}${qs({ from, to })}`,
    init
  );

export interface Facets {
  cities: string[];
  carriers: string[];
  operators: string[];
  categories: string[];
  vehicleClasses: string[];
  hotelAmenities: string[];
  priceBounds: Record<string, [number, number]>;
}

/** GET /catalogue/facets */
export const getFacets = (init?: RequestInit) =>
  get<Facets>("/catalogue/facets", init);

/** GET /catalogue/home — one round trip for every homepage rail. */
export const getHomeFeed = (init?: RequestInit) =>
  get<{ deals: Listing[]; properties: Listing[]; hotels: Hotel[] }>(
    "/catalogue/home",
    init
  );

/** GET /catalogue/slugs — drives getStaticPaths. */
export const getSlugs = (init?: RequestInit) =>
  get<{ listings: { slug: string; vertical: Vertical }[]; hotels: string[] }>(
    "/catalogue/slugs",
    init
  );

/**
 * GET /policies/:kind — the legal text, authored in the admin's content
 * section. Returns every live locale in one payload so the page can switch
 * language without a second request, exactly as the hardcoded version did.
 */
export type Policy = {
  kind: PolicyKind;
  label: string;
  effectiveFrom: string;
  bodies: Partial<Record<Locale, string>>;
};

export type PolicyKind = "NO_REFUND" | "CANCELLATION" | "TERMS" | "PRIVACY";

export const getPolicy = (kind: PolicyKind, init?: RequestInit) =>
  get<{ policy: Policy }>(`/policies/${kind}`, init).then((r) => r.policy);

/**
 * Checkout. The client sends WHAT it wants — never what it costs. Every price
 * on the returned order was computed server-side from the catalogue, so a
 * tampered payload buys nothing at a discount.
 */
export interface OrderDraft {
  items: {
    vertical: Vertical;
    listingId: string;
    roomTypeId?: string;
    startDate?: string;
    endDate?: string;
    quantity: number;
  }[];
  contact: { firstName: string; lastName: string; phone: string; email?: string };
  /** Restaurant orders only. The server re-reads the zone and its fee — this
   *  only says which one was chosen, never what it costs. */
  delivery?: { address: string; zoneId: string; notes?: string };
  travellers?: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    documentType?: string;
    documentNumber?: string;
    nationality?: string;
  }[];
  paymentMethod: "CASH" | "ONLINE";
  currency: string;
  locale: string;
}

/** POST /orders — idempotent, holds stock, returns the created order. */
export async function createOrder(
  draft: OrderDraft,
  idempotencyKey: string
): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // §4.6: the same key must be reused across retries of one checkout, so a
      // dropped response replays the original order instead of booking twice.
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(draft)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.headers.get("X-Message") ?? body?.message ?? "Checkout failed",
      res.status
    );
  }
  return body.order as Order;
}

/** GET /orders/:reference — the reference is the read capability (§7.4). */
export const getOrder = (reference: string, init?: RequestInit) =>
  get<{ order: Order }>(`/orders/${encodeURIComponent(reference)}`, init).then(
    (r) => r.order
  );

/** What `startPayment` can come back with. */
export type StartPaymentResult =
  | { status: "REDIRECT"; paymentUrl: string; reference: string }
  | { status: "OFFLINE"; rail: string; reference: string; bankDetails?: unknown }
  | { status: "PAID"; reference?: string };

/**
 * POST /orders/:reference/pay — opens a transaction at the provider.
 *
 * Note what is NOT sent: no amount, no currency. The server reads those off the
 * order, so nothing a browser can edit changes what gets charged.
 */
export async function startPayment(
  reference: string,
  rail: string,
  locale?: string
): Promise<StartPaymentResult> {
  const res = await fetch(
    `${API_BASE}/orders/${encodeURIComponent(reference)}/pay`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rail, locale })
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.headers.get("X-Message") ?? body?.message ?? "Payment failed",
      res.status,
      body?.code
    );
  }
  return body as StartPaymentResult;
}

/**
 * GET /orders/:reference/payment — is it actually paid?
 *
 * The server re-asks MaxiCash rather than trusting that we landed on a success
 * URL, so this is the only thing the return screen believes.
 */
export async function getPaymentStatus(
  reference: string
): Promise<{ paid: boolean; paymentStatus: string }> {
  const res = await fetch(
    `${API_BASE}/orders/${encodeURIComponent(reference)}/payment`,
    { credentials: "include", headers: { Accept: "application/json" } }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError("Could not check the payment", res.status);
  return body as { paid: boolean; paymentStatus: string };
}

/* ---------------------------------------------------------------- locations */

export interface ServiceLocation {
  slug: string;
  name: string;
  province?: string;
  country: string;
  kind: "CITY" | "AIRPORT" | "STATION";
  iata?: string;
  /** Alternative spellings, so "Kin" and "FIH" both find Kinshasa. */
  aliases?: string[];
  servesVerticals: Vertical[];
  image?: string;
}

/**
 * GET /locations — where the business actually operates, per vertical.
 *
 * Replaces the hardcoded city array that used to live in `lib/catalog.ts`.
 * The office owns this list now, so opening a new city is a form, not a deploy.
 */
export const getLocations = (vertical?: Vertical, init?: RequestInit) =>
  get<{ items: ServiceLocation[] }>(`/locations${qs({ vertical })}`, init).then(
    (r) => r.items
  );

export interface ServicedRoute {
  vertical: Vertical;
  origin: ServiceLocation;
  destination: ServiceLocation;
}

/**
 * GET /routes — flights and buses are sold as a pair, so which destinations
 * exist depends on where you are leaving from.
 */
export const getRoutes = (vertical: Vertical, origin?: string, init?: RequestInit) =>
  get<{ items: ServicedRoute[] }>(`/routes${qs({ vertical, origin })}`, init).then(
    (r) => r.items
  );

/* ------------------------------------------------------------------ session */

export interface CustomerSession {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  hasAccount: boolean;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      data?.message ?? res.headers.get("X-Message") ?? "Request failed",
      res.status,
      data?.code
    );
  }
  return data as T;
}

/**
 * POST /auth/otp/request — always succeeds in the same way, whether or not the
 * number is known (§7.4). The code is never in the response — it goes to the
 * handset via SMS or nowhere at all.
 */
export const requestOtp = (phone: string) =>
  post<{ expiresInSeconds: number }>("/auth/otp/request", { phone });

/**
 * POST /auth/otp/verify — sign-up. Proves the phone, creates the account with
 * the password the customer chose, and opens a 7-day session cookie.
 *
 * This is the ONLY time an SMS is needed to get in. Every later sign-in is
 * /auth/login.
 */
export const verifyOtp = (input: {
  phone: string;
  code: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}) => post<{ customer: CustomerSession }>("/auth/otp/verify", input).then((r) => r.customer);

/** POST /auth/login — the everyday way in: phone + password, no SMS. */
export const login = (input: { phone: string; password: string }) =>
  post<{ customer: CustomerSession }>("/auth/login", input).then((r) => r.customer);

/**
 * POST /auth/password/reset — spends a code from /auth/otp/request and sets the
 * new password. The server signs them in on success, so there is no login form
 * waiting on the other side of a password chosen ten seconds ago.
 */
export const resetPassword = (input: {
  phone: string;
  code: string;
  password: string;
}) =>
  post<{ customer: CustomerSession }>("/auth/password/reset", input).then((r) => r.customer);

/** PATCH /auth/me — the customer editing their own details. */
export async function updateProfile(patch: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<CustomerSession> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(patch)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.message ?? "Could not save", res.status);
  }
  return (data as { customer: CustomerSession }).customer;
}

/** GET /auth/me — null when there is no session, which is not an error. */
export async function getSession(): Promise<CustomerSession | null> {
  try {
    const r = await get<{ customer: CustomerSession }>("/auth/me");
    return r.customer;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** DELETE /auth/me — §12.4 in-app account deletion. */
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new ApiError("Could not delete the account", res.status);
}

export const logout = () => post<Record<string, never>>("/auth/logout", {});

/** GET /me/orders — every order for the signed-in phone, on any device. */
export const getMyOrders = () =>
  get<{ items: Order[] }>("/me/orders").then((r) => r.items);

/** POST /enquiries */
export async function createEnquiry(body: {
  kind: string;
  vertical: string;
  customerName: string;
  phone: string;
  email?: string;
  message: string;
  listingLabel?: string;
}): Promise<{ reference: string }> {
  const res = await fetch(`${API_BASE}/enquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // §4.6: a dropped response on a mobile network gets retried, and a
      // duplicate lead wastes a callback. The server replays the original.
      "Idempotency-Key":
        globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new ApiError(res.headers.get("X-Message") ?? "Request failed", res.status);
  }
  return res.json();
}

/**
 * Build-time helper. If the API is unreachable while `next build` runs, the
 * page still generates and ISR fills it in on the first request — a dev machine
 * without the API up should not be able to break a production build.
 */
export async function safely<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(
      `[api] ${API_BASE} unreachable during build, falling back:`,
      (err as Error).message
    );
    return fallback;
  }
}

/** GET /restaurants */
export const searchRestaurants = (
  q: { city?: string; cuisine?: string; sort?: string; limit?: number },
  init?: RequestInit
) => get<Paged<Restaurant>>(`/restaurants${qs(q as never)}`, init);

/** GET /restaurants/:slug — carries the full published menu. */
export const getRestaurant = (slug: string, init?: RequestInit) =>
  get<{ restaurant: Restaurant }>(`/restaurants/${encodeURIComponent(slug)}`, init);

export interface SiteContact {
  companyName: string;
  email: string;
  phone: string;
  whatsapp: string;
  streetAddress: string;
  city: string;
  country: string;
  officeHours: string;
}

/** GET /site/contact — the office's own details, admin-owned (§15). */
export const getSiteContact = (init?: RequestInit) =>
  get<{ contact: SiteContact }>("/site/contact", init);
