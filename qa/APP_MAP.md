# APP_MAP — Flexi Agency / CongoTravel platform

Factual map built from code reading on 2026-10-02. Four codebases:

| Repo | Stack | Dev URL |
|---|---|---|
| `travel-frontend` | Next 15.3 / React 19, Pages Router, react-query v5, Leaflet | http://localhost:3000 |
| `admin` | Next 15, Pages Router, react-query v5, axios | http://localhost:3002 |
| `travel-backend` | Node/Express, Mongoose (MongoDB Atlas), node-cron | http://localhost:3001 (`/api/v1`, `/admin/v1`) |
| `travel-application` | React Native 0.86 CLI, React Navigation 7, TanStack Query 5 | — (no emulator in this audit) |

Payments: cash by default. MaxiCash online rail exists but `ONLINE_PAYMENTS_ENABLED` is false in both backend and frontend. Stripe/Razorpay/msg91 are installed but unused.

---

## 1. Roles and permission boundaries

| Role | Where | Identity | Token |
|---|---|---|---|
| Guest | web, mobile | none | none. Can search, enquire, and **check out** (orders created by phone number) |
| Customer | web, mobile | phone + password (OTP once at sign-up) | HS256 JWT `{sub, authAt}`, aud `customer`, 7 days sliding, 90-day cap. Sent as JSON `token` **and** httpOnly cookie `ct_session`. **No server-side revocation** (`middleware/customerAuth.ts:144-174`) |
| Admin STAFF | admin | email + Argon2id password | JWT `{sub, jti}` aud `admin`; session hash stored in `AdminUser.sessions[]` (revocable). Cookie `admin_session` (httpOnly) **and** admin SPA cookie `token` (JS-readable, `admin/lib/functions/auth.lib.ts:20-27`) |
| Admin SUPER_ADMIN / BREAK_GLASS | admin | same | all 22 permissions |

Admin RBAC: `requirePermission(p)` per route (`travel-backend/src/routes/admin/v1/index.ts`), permissions re-resolved from DB on every request. Step-up (re-enter password, 5-minute window) on settings/roles/users mutations, customer export, traveller unmask. Grant rules in `accessController.ts:66-113`.

Admin panel guards are **client-side only** (`admin/components/RouteGuard/RouteGuard.tsx`, `lib/permissions.ts:205-231`); no `middleware.ts`, no SSR. Backend is the boundary.

Customer site has **no route guards at all**: `/account/*` renders a sign-in card when logged out; `/booking/*` redirects to `/` only when no checkout is in sessionStorage.

---

## 2. Web routes (travel-frontend, port 3000)

| Route | Access | Data | Notes |
|---|---|---|---|
| `/` | public | ISR 120s `GET /catalogue/home`, `/locations`; client `/site/contact`, `/routes` | |
| `/hotels` `/flights` `/bus` `/cars` `/activities` `/property` | public | ISR 300s `/catalogue/facets`; client `/hotels?…` or `/listings?…` limit 40 | no pagination |
| `/hotels/hotel/[slug]` | public | SSG fallback blocking `/hotels/:slug`; client re-price `?from&to` | |
| `/flights/offer/[slug]` `/bus/route/[slug]` `/cars/vehicle/[slug]` `/activities/activity/[slug]` | public | SSG `/listings/:slug` | **no vertical check** — any listing slug renders on any of these |
| `/property/listing/[slug]` | public | SSG `/listings/:slug` | enquiry-only |
| `/property/[transaction]/[kind]` | public | SSG `fallback:false`, 5 fixed combos | others 404 |
| `/restaurants`, `/restaurants/[slug]` | public | client-only `GET /restaurants[/:slug]` | missing slug → 200 page with error, not 404 |
| `/restaurants/checkout` | guest | `POST /orders` with `delivery` | cart in sessionStorage `ct.cart` |
| `/booking/travellers` → `/booking/contact` → `/booking/payment` | guest | `POST /orders` (Idempotency-Key), `POST /orders/:ref/pay` | state in sessionStorage `ct.checkout` incl. **plain passport numbers** |
| `/booking/payment/return` | guest | `GET /orders/:ref/payment` polled ≤20× | ref from sessionStorage only |
| `/booking/confirmation/[reference]` | **anyone with the reference** | `GET /orders/:ref`, document links | calls `clear()` on load |
| `/login?mode=&next=` | public | `/auth/login`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/password/reset` | `next` not validated (open redirect) |
| `/account`, `/account/bookings`, `/account/bookings/[ref]`, `/account/profile`, `/account/saved`, `/account/enquiries` | customer (sign-in card when out) | `/me/orders`, `/orders/:ref`, `PATCH/DELETE /auth/me` | enquiries & saved are localStorage only |
| `/contact`, `/help`, `/about`, `/terms`, `/privacy`, `/404` | public | `/site/contact`, `/policies/:kind`, `POST /enquiries` | |
| `/api/hello` | public | — | Next boilerplate, returns `{name:"John Doe"}` |

Client persistence (web): cookie `ct_session` (httpOnly, set by API). localStorage `ct.prefs`, `ct.orders` (≤50 refs), `ct.enquiries` (**PII**), `ct.saved`, `ct.recent`, `ct.viewed`. sessionStorage `ct.checkout`, `ct.checkout.key`, `ct.checkout.key.currency`, `ct.cart`, `pendingOrderRef`. react-query defaults `refetchOnMount:false`, `refetchOnWindowFocus:false`, `retry:0`.

Env (public): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_STORAGE_ORIGIN`, `NEXT_PUBLIC_MAPTILER_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DOMAIN`, `NEXT_PUBLIC_HERO_IMAGE`. **Risk:** `next.config.ts:105-113` `env:` block exposes `NEXT_APP_ENCRYPTION_KEY`, `NEXT_APP_CLIENT_SECRET`, `NEXTAUTH_SECRET` to the client bundle if ever referenced.

## 3. Admin routes (admin, port 3002)

| Page | Permission | Endpoints |
|---|---|---|
| `/` | dashboard:read | `GET /dashboard`, `/orders/queue-counts` |
| `/bookings`, `/bookings/[id]` | orders:read (write for actions) | `GET /orders`, `/orders/:id`; `POST …/transition`, `…/cash-received`, `…/notes`, `…/documents` |
| `/customers`, `/customers/[id]` | customers:read/write | `GET/PATCH /customers[/:id]` |
| `/enquiries` | enquiries:read/write | `/enquiries`, `…/stage`, `…/notes`, `…/quote` |
| `/inventory`, `/inventory/[id]`, `/inventory/{hotel,listing,restaurant}/[id]` | inventory:read/write | hotels, listings, restaurants, room-types, calendar, menu, uploads, CSV import |
| `/locations` | inventory:read/write | `/locations`, `/routes` |
| `/payments` | payments:read | `GET /payments` |
| `/content` | content:read/write | `/policies` |
| `/notifications` | notifications:read/write | `/notifications/templates`, `/notifications/test` |
| `/settings` | settings:read/write + step-up | `GET/PATCH /settings` |
| `/users`, `/roles` | users:*/roles:* + step-up | `/users`, `/roles` |
| `/audit-log` | audit:read | `/audit-logs` |
| `/account`, `/login` | session / public | `/auth/*` |
| `/api/hello` | — | boilerplate |

## 4. Mobile screens (travel-application)

Root stack (`App.tsx:181-226`): Tabs (Explore, Restaurants, Trips, Account), Restaurant, Hotel, Results, Checkout (modal), Booking (modal), Order, Saved, Login. No guarded routes; **guest checkout allowed**. Token in Keychain (`lib/api.ts:28`); AsyncStorage holds cart/saved/prefs. Deep links `flexiagency://`, `https://flexiairbnb.com/*` — iOS has no associated-domains entitlement; **Android manifest has no intent-filter at all**. No WebViews; payment/docs open externally. No offline handling. API host hardcoded in `lib/config.ts:11-15` (LAN IP in dev, production host in release). No Maestro/Detox; the only jest test is the RN template.

---

## 5. API endpoints

### Public `/api/v1` (global 300 req/15 min per IP, in-memory store)

| Method path | Auth | Limiter | Input / validation | Response |
|---|---|---|---|---|
| GET /catalogue/home, /catalogue/facets, /catalogue/slugs | — | cache | — | feeds; facets `distinct` without status filter |
| GET /locations?vertical, /routes?vertical&origin | — | cache | enum else ignored | `{items}` |
| GET /listings | — | 120/5min | `vertical` enum (400), `q`≤80 escaped, `city/origin/destination` escaped **uncapped**, numeric filters, `limit`≤60, `sort` allow-list | `{items,total,limit}` |
| GET /listings/:slug, /hotels/:slug, /restaurants/:slug | — | cache | | `{listing,related}` / `{hotel,others}` / `{restaurant}` |
| GET /hotels, /restaurants | — | 120/5min | | |
| GET /site/contact, /policies/:kind | — | cache | kind enum else 404 | |
| POST /enquiries | — | 10/h | `customerName`≥3 (no max), `phone` normalised, `message` req ≤2000, `email` **unvalidated**, `listingLabel` unbounded, opt `Idempotency-Key` | 201 `{reference}` |
| POST /auth/otp/request | — | 10/h | `phone` | `{expiresInSeconds:300}` always |
| POST /auth/otp/verify | — | 10/h | `phone`, `code` /^\d{4,8}$/, `firstName` req ≤80, `lastName` ≤80, `password` ≥8 | `{token,expiresIn,customer}` + cookie |
| POST /auth/login | — | 20/h | `phone`, `password` | same |
| POST /auth/password/reset | — | 10/h | `phone`, `code`, `password` | same |
| POST /auth/logout | — | | | clears cookie only |
| GET/PATCH/DELETE /auth/me | customer | | PATCH: `firstName` non-empty ≤80, `lastName`, `email` regex | `{customer}` |
| GET /me/orders | customer | | | `{items}` ≤100 |
| POST/DELETE /me/devices | customer | | `token` ≤4096, `platform` ios/android | |
| POST /orders | **optional** customer | 20/h | header `Idempotency-Key` req (unscoped, uncapped); `items[]` 1–10 `{vertical,listingId,roomTypeId?,startDate?,endDate?,quantity 1–20}`; `contact{firstName,lastName,phone,email?}` (email unvalidated); `travellers[]` ≤20 **unvalidated**; `paymentMethod`, `currency`, `locale`, `delivery` | 201 `{order}`; 200 replay |
| POST /orders/:reference/pay | **none** | 20/h | `rail` enum, `locale` | REDIRECT / OFFLINE / PAID |
| ALL /payments/maxicash/notify | **none, unsigned** | 600/15m | reference / pmtid / status | `{received}` |
| GET /orders/:reference/payment, /orders/:reference, /orders/:reference/documents/:id | **reference only** | 60/15m | | public order DTO (no `_id`, no cost) |

### Admin `/admin/v1` (600 req/15 min)

Auth chain: `protectAdmin` → `requirePasswordChanged` → `requirePermission` (→ `requireStepUp`). `GET /files/:key` is HMAC-signed, unauthenticated. Full table in backend report; notable inputs:

- `POST/PATCH /hotels`, `/hotels/:id/room-types`, `/listings`, `/restaurants`, `/restaurants/:id/menu` — **`...req.body` spread into create/update** (mass assignment).
- `POST /orders/:id/transition` `{to, reason, cancellationReason}`; `POST /orders/:id/cash-received` `{reason?}` — **no status guard**.
- `GET /customers?q=` and admin `GET /locations?q=` — **unescaped `$regex`**.
- `PATCH /settings` — copies every settings key with no min/max.
- `POST /notifications/test {to, body}` — SMS to any number.

Error body: `{status, code, message}`; in `NODE_ENV=development` also `error`, `details`, `stack`. JWT errors map to **404**.

---

## 6. Forms and validation (client vs server)

| Form | Client rule | Server rule | Disagreement |
|---|---|---|---|
| Web/mobile sign-in | phone via `toE164` (23 countries, CD = 9 digits), password non-empty | phone normalise, bcrypt compare | — |
| Sign-up | code 4–8 digits (input capped 6), password ≥8, firstName req | same + lastName ≤80 | OTP is 6 digits; client regex allows 4–8 |
| Profile | email regex; names may be empty | `firstName` non-empty ≤80 | client allows empty first name → server 400 |
| Hotel room picker | check-in ≥ today, check-out ≥ check-in+1, adults 1–6, rooms 1–3 | **no date validation** (past dates accepted) | server weaker |
| Car BookingBox | dates min today, qty ≤ min(9, stock) | qty 1–20, units from client dates | reversed dates possible (`BookingBox.tsx:32-35`) |
| Travellers | first/last name req, flights need document number, DOB ≤ today | **none** | client writes `documentNumberMasked`, server expects `documentNumber` |
| Contact step | names req, phone valid, email format | contact.email unvalidated | — |
| Restaurant checkout | names, phone, address, zone, zone minimum (USD), terms | delivery zone priced server-side | client gives **no field-level error** |
| Lead/enquiry | name ≥3, phone valid, message req | name ≥3, phone normalised, message ≤2000, email unvalidated | — |
| Admin customer edit | none | none | phone regex only via schema |
| Admin settings | none (`Number("")` → 0) | none | 0 / negative persisted |
| Admin room type | none on maxAdults/children | `...req.body` | negatives persisted |
| Admin login | zod email + password | argon2, lockout after 3 | — |
| Admin change password | ≥14, confirm match | ≥14, HIBP (fails open) | — |

---

## 7. External integrations

| Integration | Where | Error handling |
|---|---|---|
| MaxiCash (payments, disabled) | `services/payments/maxicash.service.ts`, `controllers/public/paymentController.ts` | 20 s abort → 502; webhook unsigned; no amount check |
| Twilio SMS (OTP, order notifications) | `services/notifications/sms.service.ts`, `notify.service.ts` | OTP failure → 502; notify() swallows errors |
| Firebase Admin push | `services/notifications/push.service.ts` | prunes dead tokens |
| Azure Comm / Gmail email (admin temp passwords only) | `utils/email_sms.ts` | errors swallowed |
| S3 or local storage | `services/storage/*` | signed links, secret falls back to `ADMIN_JWT_SECRET` |
| HIBP | `passwordPolicy.ts` | fails open |
| MapTiler / OSM tiles | frontend `LeafletCanvas.tsx` | CSP `img-src` lacks `{a,b,c}.tile.openstreetmap.org` |
| node-cron (in-process) | `services/scheduledJobs.service.ts` | one try/catch for the whole batch |

Committed secrets: backend `dev-data/data/import-dev-data.{ts,js}` hardcode a `mongodb+srv://` URI with credentials (in git since `344b1bd`); mobile `android/keystore.properties` + release keystore are tracked.

---

## 8. Persistent state

- **DB (MongoDB):** `orders` (reference unique, idempotencyKey unique sparse, optimistic concurrency, status/paymentStatus/fulfilmentStatus enums, prices computed server-side), `platform_customers` (phone **not unique**), `listings` (slug unique, quantityTotal/Sold/Held), `hotels`, `roomtypes`, `rateplans` (roomType+date unique; allotment/sold/held/blocked), `restaurants`, `menuitems`, `locations`, `servicedroutes`, `enquiries`, `policyversions`, `settings` singleton, `auditlogs`, `notificationtemplates`, `notificationlogs`, `devicetokens`, `phone_verifications` (TTL), `adminusers`, `accessroles`.
- **Sessions:** customer = stateless JWT; admin = jti hash list on user doc.
- **Caches:** backend `cacheable(n)` on catalogue GETs; rate limiters in-memory; ISR on frontend home/results/legal pages.
- **Cron:** every 10 min — cash reminders, release expired holds (cancels DRAFT/SUBMITTED with UNPAID/PENDING/FAILED past `cashDeadline`), scheduled publish, flag undocumented orders; nightly — passport purge, stale listing expiry, inventory drift alert.
