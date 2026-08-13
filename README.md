# CongoTravel — public website

Public-facing site for the DRC travel & property booking platform. Built against
`01-Public-Platform-Build-Guide.md` (v2) and the domain model in the sibling
`travel-backend` repo.

```bash
npm run dev     # http://localhost:3000
npm run build   # also regenerates sitemap + robots.txt via next-sitemap
npm run lint
node scripts/gen-images.mjs   # regenerate the artwork in public/img
node scripts/fetch-photos.mjs # re-download the two curated photo rails
```

## Where things are

| Path | What |
|---|---|
| `lib/api.ts` | The catalogue client. One function per `/api/v1` route, used by `getStaticProps` and react-query alike |
| `lib/catalog.ts` | URL vocabulary and image fallbacks. The destination list now lives in the admin — see Locations |
| `lib/locations.ts` | `useLocations` / `useRoutes` — serviced places and origin→destination pairs, from the API |
| `lib/store.ts` | Per-device only: booked references, favourites, recent searches, guest session. Orders themselves are server-owned |
| `lib/checkout.tsx` | Checkout state and `confirm()`, which POSTs the order. Prices and stock are decided server-side |
| `lib/orders.ts` | `useOrder` / `useMyOrders` — orders are re-read from the API, never cached locally |
| `lib/money.ts` | Integer minor units, USD base, admin-controlled FX, `Intl` formatting |
| `lib/policy.ts` | Parses the policy body the admin publishes, and holds the fallback text. Defined **once** (§13.6) |
| `lib/i18n.ts` | fr/en catalogues. Fallback: locale → French → key. Never English by default |
| `typescript/interface/domain.interface.ts` | Mirrors `travel-backend/src/constants/domain.constants.ts` 1:1 |
| `scripts/gen-images.mjs` | Generates all 50 SVG scenes in `public/img` (seeded, deterministic, no dependencies) |
| `scripts/fetch-photos.mjs` | Downloads + WebP-encodes the 14 photos behind the inspiration and destination rails. Output is committed |

## Design system

Everything visual is tokenised in `styles/globals.css` under `@theme`, and the
handful of repeated patterns are `@utility` classes rather than copied class
lists. If a card, button or headline looks wrong, it is wrong in one place.

| Token / utility | What it is for |
|---|---|
| `--color-brand-*`, `--color-accent-*` | §11.6 navy + amber. Amber is the CTA and nothing else |
| `--color-ink-*`, `--color-paper` | Warm neutrals. Page sits on `#FBFAF8`, cards are pure white — the contrast is what stops the layout reading as a wireframe |
| `--shadow-xs … --shadow-xl` | Layered, low-opacity elevation. One hard shadow reads as a 2012 card |
| `.surface` | White + hairline ring + soft shadow. The card primitive |
| `.card-lift` | 3px hover rise on an ease-out curve |
| `.display` | Fraunces serif for headlines only; body stays on Inter |
| `.eyebrow` | Tracked uppercase label above a headline |
| `.tnum` | Tabular figures, so prices do not jitter as digits change |
| `.btn` + `.btn-primary` / `.btn-dark` / `.btn-outline` + `.btn-sm/md/lg` | Every CTA on the site is the same object. Scale on hover/press, focus ring, `aria-busy` loading state |
| `.field` / `.field-label` / `.field-input` | Floating-label form control. Label is legible empty *and* full, which a placeholder-only field never is |
| `.skeleton` + `<Skeleton>` / `<CardSkeleton>` | Shimmer placeholders shaped like the content they replace, not spinners |
| `--text-2xs … --text-5xl` | Named type scale. Arbitrary px sizes drift within a week |
| `--ease-out-soft`, `--animate-fade-up/-in/-shimmer` | One easing curve, 200–300ms, used everywhere |
| `--spacing` | 8-pt grid: Tailwind's even steps (2, 3, 4, 6, 8, 12, 16, 20, 24) are 8/12/16/24/32/48/64/80/96px |

Components worth knowing about: `components/ui/field.tsx` (form primitives + skeletons),
`components/catalog/Reviews.tsx`, `components/catalog/RecentlyViewed.tsx` (with the
`useRecordView` hook detail pages call), and recent-search / recently-viewed
persistence in `lib/store.ts`.

**Artwork.** `scripts/gen-images.mjs` generates all 50 scenes. It is not trying
to imitate photography — it commits to cinematic gradient illustration, which
generated SVG can actually do well. Four techniques carry it: aerial
perspective (receding layers mixed toward the horizon colour), an `feTurbulence`
grain overlay, soft light (bloom, horizon haze, shafts), and Catmull-Rom
silhouettes instead of triangles. Re-running the script is deterministic.

## Running it

The catalogue is served by `travel-backend`; there is no local copy any more.

```bash
# 1. seed a local database (refuses to touch a non-local one without SEED_CONFIRM=1)
cd ../travel-backend
MONGODB_URI="mongodb://127.0.0.1:27017/travel_dev" npm run seed:catalogue

# 2. start the API on :3001
MONGODB_URI="mongodb://127.0.0.1:27017/travel_dev" PORT=3001 npm run dev

# 3. start the site on :3000
cd ../travel-frontend && npm run dev
```

Two things must agree or the browser silently gets nothing:

- `ORIGIN` in the backend `.env` must list the frontend origin (CORS is an
  explicit allow-list — never `*`).
- `NEXT_PUBLIC_API_BASE_URL` in `.env.local` feeds both the client *and* the
  `connect-src` directive in `next.config.ts`. If they drift, server-rendered
  pages keep working while every client-side fetch is blocked by CSP — which is
  exactly the bug that shipped in an earlier revision of this file.

## The API

| Route | What it does |
|---|---|
| `GET /api/v1/catalogue/home` | Every homepage rail in one round trip |
| `GET /api/v1/catalogue/facets` | Filter options derived from what is on sale |
| `GET /api/v1/catalogue/slugs` | Drives `getStaticPaths` |
| `GET /api/v1/listings` | Allow-listed search; sold-out rows stay in the set (§1) |
| `GET /api/v1/listings/:slug` | Detail + related |
| `GET /api/v1/hotels` | Priced against a date range from the rate plans |
| `GET /api/v1/hotels/:slug` | Hotel + room types + nightly availability |
| `POST /api/v1/enquiries` | Request-to-Book and property leads, idempotent |
| `POST /api/v1/orders` | Checkout. Re-prices server-side, holds stock atomically, idempotent |
| `GET /api/v1/orders/:reference` | The order. The reference *is* the read capability (§7.4) |
| `POST /api/v1/orders/:reference/pay` | Stand-in for the payment provider — see below |
| `GET /api/v1/policies/:kind` | Legal text published from the admin content section |

`src/dto/public/catalogue.dto.ts` is an allow-list serialiser: `costPrice`,
`supplier` and `createdBy` have no field in it, so they cannot leak (§10.3).

## Checkout

The booking flow is server-backed end to end: an order created on the site
appears in the admin's `needs-action` / `cash-pending` queues immediately,
because both read the same `orders` collection.

The client sends **what** it wants — never what it costs:

| Decided server-side | Why |
|---|---|
| Every price | `pricing.service.ts` re-reads the catalogue. A price posted by a browser is a price chosen by whoever drives that browser |
| `unitCostPrice` / `lineCost` | Required for margin (§5) and must never travel to a public client in either direction, so a lookup is the only source |
| Stock | `inventory.service.ts` — the availability test and the increment are one atomic update, so two people racing for the last seat cannot both win |
| The reference | ~50 bits of entropy (§10.3), and it doubles as the read capability |
| Consent text | Snapshotted from the live `PolicyVersion`, so it is provably what the content section had published (§2.2) |

Three inventory transitions, never skipped: `hold` at checkout, `commit` on
payment, `release` on expiry or failure. Unpaid orders carry a deadline —
minutes online, hours for cash — and `releaseExpiredCashHolds` puts the units
back. Without that sweep an abandoned basket destroys stock permanently.

**Cash** stops at `SUBMITTED / UNPAID / NOT_STARTED` holding stock, and settles
when the admin marks cash received. **Online** is
`POST /orders/:reference/pay` — marked `ponytail:` in the controller. It writes
the same fields a real webhook would, so swapping it for a provider redirect
plus a callback is a change to that one handler. §9.3 makes the webhook the
source of truth in production; a client-callable pay route must never survive
into it.

Still local-only, and marked as such in `lib/store.ts`: the signed-in customer,
favourites, recent searches, and *which* references this device booked —
"my bookings" resolves that list against the API one call at a time, because
`GET /me/orders` needs customer auth that does not exist yet. Same customer,
new phone, no history.

## Images

The catalogue stores whatever the storage adapter returned. With
`STORAGE_DRIVER=local` that is a **root-relative** path — `/uploads/<folder>/<uuid>.png`
— which is relative to the **API** origin, not to this site. Rendering it
straight into `<Image src>` makes the browser ask this app for a file that only
exists on the API host.

`lib/media.ts` is the single resolver. Every image render point goes through it:

| stored value | resolves to |
|---|---|
| `/uploads/hotels/x.png` | `<storage origin>/uploads/hotels/x.png` |
| `/img/room-1.svg` | unchanged — a file in this app's `public/` |
| `https://cdn…/x.jpg` | unchanged — what the S3/Azure driver returns |
| empty / missing | `/img/banner-1.svg` |

Three places must agree on the storage origin, all derived from
`NEXT_PUBLIC_API_BASE_URL` (override with `NEXT_PUBLIC_STORAGE_ORIGIN`):

1. `lib/media.ts` — builds the URL
2. `next.config.ts` → `images.remotePatterns` — or next/image returns **400
   "url parameter is not allowed"**
3. `next.config.ts` → CSP `img-src` — or the browser blocks every image while
   server-rendered HTML still looks correct

The backend already sets `Cross-Origin-Resource-Policy: cross-origin` on
`/uploads` specifically so another origin can embed them.

**Hero image.** Drop a file at `public/img/hero.{avif,webp,jpg,jpeg,png}` and
`getStaticProps` picks it up — most-compressed extension first, so a WebP beats
a PNG sitting beside it. Override with `NEXT_PUBLIC_HERO_IMAGE`, which accepts
any of the forms above (`/uploads/hero/<uuid>.png` works too).

**Editorial photography.** The two curated rails — "Des idées pour partir" and
"Destinations populaires" — are the only images not from the catalogue, because
there is nothing in the database to point them at. `scripts/fetch-photos.mjs`
downloads them once, crops to the 4:5 both tiles use, encodes WebP and writes
`public/img/photos` plus a `credits.json` recording every source. The bytes are
committed; nothing is fetched from a third party at runtime, so there is no CDN
to add to the CSP and no external host that can rot or rate-limit us.

These are **representative stock photographs, not photographs of the city each
one labels.** Kinshasa's tile is a generic dense-downtown aerial. Replace them
with licensed local photography before launch — the filenames are the city
slugs, so it is a drop-in swap with no code change.

## Locations

Where the business operates is owned by the admin, not by this codebase.

The search box used to offer a hardcoded array of eight cities compiled into the
bundle, while the filter facets came from `distinct(city)` over inventory — two
lists that could disagree, where one typo invented a permanent city and adding a
real one needed a deploy (§15).

Now `GET /api/v1/locations?vertical=HOTEL` is the single source for the search
suggestions, the popular-destination chips and the homepage tiles. Flights and
coaches additionally read `GET /api/v1/routes?vertical=FLIGHT&origin=<slug>`,
because those are sold as a pair — listing two cities separately would imply we
travel between every pair we touch.

A place the customer types that we do not service is **accepted, not refused**:
the search runs with `?enquiry=1`, and the results page leads with the lead form
saying plainly that we do not go there yet. "We have not bought stock for these
dates" and "we do not serve this city" are different messages, and conflating
them makes the second look like bad luck. It also tells the office which cities
people keep asking for.

Server-side, `city` on a listing must name an **active** location that is ticked
for that **vertical** — a town the coach passes through is not somewhere a car
can be hired, and letting inventory be filed there anyway is how the list stops
describing reality.

## Legal pages

`/terms` and `/privacy` render `PolicyVersion` documents authored in the admin's
content section (`GET /api/v1/policies/:kind`, ISR at 300s — publishing in the
admin reaches the site without a deploy). §15 lists "making the owner wait for a
developer to change a policy text" as a thing to avoid.

Stored bodies are plain text, not HTML: a line starting with `## ` is a heading.
The admin panel is a trusted-ish surface, not a trusted one, and rendering its
markup into a public page would be a stored-XSS hole for the sake of italics.

The constants in `lib/policy.ts` and `pages/privacy.tsx` are the **fallback**,
kept deliberately: these pages are linked from every consent point and are
required by both app stores (§12.4), so an unreachable API must degrade to the
last shipped text rather than to a blank page. `scripts/seedPolicies.ts` in the
backend loaded those same constants into Mongo as v1.0.

Still hardcoded: the no-refund sentence *at checkout*. `/terms` reads it from
the API, but `lib/checkout.tsx` snapshots `CURRENT_POLICY` onto the order. Moving
it means storing the `PolicyVersion` id on the order, which needs the orders
endpoints that do not exist yet (see `lib/store.ts`).

## Guide requirements that are load-bearing here

- **No-refund policy (§2.2)** — one source of text in `lib/policy.ts`, surfaced
  three times before payment (listing box, price summary, payment step), captured
  as a separate unticked blocking checkbox, and snapshotted onto the order with
  locale and timestamp. Repeated on the confirmation and in the booking detail.
- **Empty state (§1)** — `components/catalog/EmptyState.tsx` is a lead form with
  alternatives, not a shrug. The Request-to-Book form also appears on every
  *non-empty* results page and every detail page.
- **Three status axes (§4.3)** — rendered as three separate badges, never merged.
- **No cancel button (§4.4)** — the booking detail says "contact support".
- **Honest scarcity (§11.6)** — `Scarcity` only renders below 5 units and states
  the real number. There is no urgency counter anywhere in this codebase.
- **Property is enquiry-only (§1.1 archetype C)** — no price box, no hold, and no
  route from a property page into `/booking`.
- **Anti-enumeration (§7.4)** — `/login` shows the same response whether or
  not the number exists.
- **Security headers (§10.8)** — set in `next.config.ts`, with `no-store` forced
  on `/account` and `/booking`.

## Known simplifications

Each is marked in the code at the point it applies:

- `sessionStorage` checkout rather than a server-side cart — survives a reload
  and a dropped request, not a device switch. Move to `POST /api/v1/carts`.
- Plain `{name}` interpolation instead of full ICU MessageFormat. Swap in
  `@formatjs/intl-messageformat` when a real plural/select is needed; `t()` is
  the only call site.
- CSP still allows `'unsafe-inline'` for scripts. Nonce-based CSP needs
  middleware, which would force the catalogue off static generation — see the
  comment in `next.config.ts` for the upgrade path.
- No service fee line: §17 Q1 (markup model) is still open with the client, so
  none is invented. It is added in `lib/checkout.tsx` and `Summary`, never at
  the payment step.
- Prices are per-currency and explicit (`Money`), matching the backend. When a
  currency has no typed price the figure is converted from USD and shown with a
  `≈` — never presented as if it were the charge.
- Reviews in `components/catalog/Reviews.tsx` render seeded illustrative
  quotes, not collected reviews. §17 Q17 recommends leaving review collection
  out of v1; swap `SAMPLES` for an endpoint if the client decides otherwise.
- A second font family (Fraunces, two static weights, latin-ext) against §11.6's
  "one family, two weights". It is the single largest step in perceived quality
  and costs ~20 KB. If the §11.7 3G budget gets tight, drop `--font-display`
  from `globals.css` and every headline falls back to Inter with no other change.
