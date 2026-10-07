# FIXES — what was changed, where, and how it was verified

Companion to `BUGS.md`. Scope requested: website (`travel-frontend`), admin (`admin`), backend (`travel-backend`). Mobile-only items (BUG-005, BUG-026) were out of scope. All changes are in the working tree only — nothing committed or pushed.

## Verification (final state)

| Check | Result |
|---|---|
| `travel-backend` `tsc --noEmit` | 0 errors |
| `admin` `tsc --noEmit` | 0 errors (one pre-existing dead import removed so `next build` lint passes) |
| `travel-frontend` `tsc --noEmit` | 0 errors (`qa/` excluded from the app tsconfig — it's its own Playwright project) |
| `qa/tests/api.core.spec.ts` | **16 / 16 pass** |
| `qa/tests/api.destructive.spec.ts` | **6 / 6 pass** — evidence in `qa/evidence/api-destructive.jsonl` |
| 360 px overflow crawl (`/contact`, `/login`, 5× `/account/*`) | **7 / 7 no horizontal overflow** |
| Runtime smoke (web `/`, `/login`, `/hotels`, property page; admin `/login`) | all 200 |
| Live checks | wrong-vertical slug → 404 (BUG-022); `/api/hello` → 404 on both apps (BUG-029); fictional agent/placeholder phone absent from served HTML (BUG-020) |

The two API suites now double as regression tests: every assertion is written for the *fixed* behaviour. Re-run with `cd travel-frontend/qa && npx playwright test api.core api.destructive --project=api --workers=1`. The destructive suite creates `qa_test_` orders/listings and cleans them up in `afterAll`; `POST /orders` is rate-limited to 20/hour per IP, so leave headroom between runs (a backend restart clears the in-memory counter).

## Backend — `travel-backend`

| Bug | Fix | Where | Verified |
|---|---|---|---|
| BUG-001 cash-received not guarded / not idempotent | Reject unless `status=SUBMITTED && paymentStatus=UNPAID` (409) | `controllers/admin/orderController.ts` `markCashReceived` | 2nd call → **409**, sold stays `[0,1,1]`; cancelled order → **409**, stays CANCELLED |
| BUG-002 guest checkout overwrites / attaches to an account | Identity fields moved to `$setOnInsert` (never overwrite); plus a guard: a phone that belongs to a registered account that the caller hasn't signed in as → **409 `ACCOUNT_EXISTS`** ("please sign in") | `controllers/public/orderController.ts` | 409, name unchanged, order not attached |
| BUG-003 payment settlement trusts provider blindly | Compare provider amount+currency to `chargedTotal`/`chargedCurrency` before PAID; API-call status separated from payment status (fails closed to PENDING); `TODO` marks where webhook signature verification belongs (needs MaxiCash spec) | `services/payments/maxicash.service.ts`, `controllers/public/paymentController.ts` | code-level (online payments disabled) |
| BUG-004 committed Mongo URI | Literal replaced with `process.env.MONGODB_URI` | `dev-data/data/import-dev-data.{ts,js}` | **ACTION REQUIRED:** rotate that credential on Atlas and purge it from git history — removing it from source does not revoke it |
| BUG-006 stack / driver internals leaked | Prod: non-operational errors collapse to generic 500; dev: raw `error` object no longer echoed; known-error mapping (ValidationError/CastError/dup-key/JWT) now applies in **every** env (was prod-only, so dev returned 500 where prod returned 400); quote-less dup-key message no longer throws inside the handler | `controllers/errorController/errorController.ts` | core: no driver internals; settings `-5` → 400 locally. **ACTION:** deployed envs must run `NODE_ENV=production` |
| BUG-007 unescaped `$regex` (500 + ReDoS) | Escaped + length-capped search term | `controllers/admin/customerController.ts`, `admin/locationController.ts` | core passes (no 500) |
| BUG-008 no date validation | `validateDates()`: invalid, reversed, past, >365-day spans → 400 | `services/orders/pricing.service.ts` | core passes |
| BUG-009 idempotency key unscoped | `idempotencyScope` (customer id or normalised phone) stored on the order; replay from a different caller → 409 `IDEMPOTENCY_KEY_USED` | `controllers/public/orderController.ts`, `model/orderModel.ts` | replay → **409**, other caller's order never returned |
| BUG-010 mass assignment | `...req.body` replaced by explicit allow-lists via `utils/pick.ts`; status/slug/counters/vertical(update)/createdBy never accepted | `controllers/admin/{listing,hotel,restaurant}Controller.ts` | forged `status`/`quantitySold` ignored (stored DRAFT, 0); vertical immutable |
| BUG-013 settings unbounded | `min`/`max`/`required` on all 8 numeric settings (schema validates on `save()`) | `model/settingsModel.ts` | `holdTtlCashHours:-5` → **400** |
| BUG-014 order contact/traveller unvalidated | Email format, string-only names (blocks operator injection), DOB ≤ today, `enc:v1:` prefix refused | `controllers/public/orderController.ts` | core passes |
| BUG-015 enquiry unvalidated | Email format; name/label ≤ 120 chars | `controllers/public/enquiryController.ts` | core passes |
| BUG-016 logout doesn't revoke token | `tokensValidFrom` on customer; logout stamps it; auth rejects older `iat` | `model/customerModel.admin.ts`, `middleware/customerAuth.ts`, `controllers/public/customerAuthController.ts` | code-level |
| BUG-017 phone not unique | `unique: true` index | `model/customerModel.admin.ts` | **ACTION:** if duplicate phones already exist the index won't build until they're merged (app keeps running; no data was touched) |
| BUG-018 test SMS to any number | E.164 check; provider error text logged, generic message returned | `controllers/admin/opsController.ts` | code-level (no SMS sent) |
| BUG-019 OTP cap resets on resend / racy | Attempts persist across resends; atomic `$inc` | `controllers/public/customerAuthController.ts` | code-level (no SMS sent) |
| BUG-024 no bookable stock | No code change — seed math is correct; the DB was simply unseeded/held. Reseed or add a QA reset | `scripts/seedCatalogue.ts` | n/a |
| BUG-030 JWT error → 404 | → 401 | `errorController.ts` | — |

## Admin — `admin`

| Bug | Fix | Where |
|---|---|---|
| BUG-025 double-submit / step-up double-Enter | `confirm()` ignored while busy; `isPending` disables cash-received, publish (hotel/listing/restaurant), menu archive, make-live, send-test, duplicate; confirm dialogs on Cancel, Mark completed, Mark cash received | `components/StepUp/useStepUp.tsx`, `pages/bookings/[id].tsx`, `pages/inventory/**`, `pages/content.tsx`, `pages/notifications.tsx` |
| BUG-013 (client) empty numeric saved as 0 | Empty → omitted from payload ("unchanged"); NaN guarded | `pages/settings.tsx` |
| BUG-028 missing error/loading states | Shared `components/QueryError.tsx`; error branch distinct from empty on 14 pages; 404 vs error on detail pages; loading guards on the 3 edit forms; `onError` on previously silent mutations | `pages/**` |
| BUG-029 boilerplate | `pages/api/hello.ts` deleted | — |
| extras | 401 redirect keeps the query string; login honours `?next` when already signed in; `tel:`/`wa.me` links guarded against missing phone; dead `Banknote` import removed | `api/axiosInstance/index.ts`, `pages/login.tsx`, `components/Enquiries/enquiry.lib.ts`, `pages/bookings/[id].tsx`, `pages/index.tsx` |

Not changed (by design): the admin SPA `token` cookie is still JS-readable — changing that requires the backend to serve the admin UI session httpOnly-only; out of scope for this pass.

## Website — `travel-frontend`

| Bug | Fix | Where | Verified |
|---|---|---|---|
| BUG-011 open redirect | `next` followed only if same-origin relative path (mirrors admin) | `pages/login.tsx` | code-level |
| BUG-012 passport dropped | Sends `documentNumber` + `documentType` (defaults PASSPORT) | `lib/checkout.tsx` | code-level (needs bookable stock to e2e) |
| BUG-020 fictional agent / placeholder phone | Removed; contact from site settings; hidden when absent | `pages/property/listing/[slug].tsx`, `components/catalog/LeadForm.tsx`, `lib/contact.ts`, `components/site/Footer.tsx` | **live:** absent from served HTML |
| BUG-021 360 px overflow | `min-w-0` on the three grid items whose `min-width:auto` was inflating the shared track (account nav; contact office column; contact form card — the Radix `<select>` fallback's nowrap country names were the hidden forcer) | `components/account/AccountLayout.tsx`, `pages/contact.tsx` | **7/7 routes clean** |
| BUG-022 wrong vertical renders | `listing.vertical` must match the route else `notFound` | 5 detail pages | **live:** property slug on flight route → 404 |
| BUG-023 broken images / OG double-origin | Restaurant images + destination tiles through `mediaUrl()`; Layout only prefixes relative paths | `pages/restaurants/*`, `components/catalog/cards.tsx`, `components/site/Layout.tsx` | code-level |
| BUG-027 `html lang` | Set from saved locale on load | `lib/prefs.tsx` | — |
| BUG-028 empty-vs-loading/error | Distinct states on account pages; graceful empty state on home rails | `pages/account/*`, `pages/index.tsx` | — |
| BUG-029 boilerplate | `pages/api/hello.ts` deleted | — | **live:** 404 |
| extras | Reversed-date guards (car + hotel); lead form validates only the blurred field; `qa/` excluded from app tsconfig | `components/catalog/BookingBox.tsx`, `pages/hotels/hotel/[slug].tsx`, `components/catalog/LeadForm.tsx`, `tsconfig.json` | — |

Left untouched on purpose: hardcoded reviews (`components/catalog/Reviews.tsx` — product decision), i18n content gaps, the `next.config.ts` `env:` block and CSP (ops).

## Still needs a human

1. **Rotate the Atlas credential** that was committed (BUG-004) and purge git history.
2. **Set `NODE_ENV=production`** in every deployed backend environment (BUG-006).
3. **Merge duplicate customer phones** before the unique index can build (BUG-017).
4. **Reseed / add a QA inventory reset** so end-to-end booking can be exercised (BUG-024).
5. **MaxiCash signature spec** to complete webhook verification before online payments are enabled (BUG-003).
6. Mobile items BUG-005 (committed keystore — rotate) and BUG-026 remain open.

---

## Round 2 — the five "needs a human" items, investigated and narrowed

Each was investigated against the real repos, dev DB and public docs. What could be done safely was done; what remains is listed with exact steps.

| # | Item | Done (verified) | Still yours |
|---|---|---|---|
| 1 | Committed Atlas credential | `travel-backend/.env.minimal` **still contained the live URI** (missed by the first pass) → now untracked + gitignored. Secret confirmed in **all 13 backend commits**, pushed to the private GitHub remote. Mobile: release keystore + passwords are in the **public** `travel-application` repo since 2026-08-30 → treat as compromised. | Rotate in Atlas **first**, purge history **second** (steps below); Play Console upload-key reset. |
| 2 | `NODE_ENV=production` | Deploy is **AWS Elastic Beanstalk via CodeBuild** (`buildspec.yml`, `Procfile`, `.platform/`). Added `.ebextensions/01-env.config` (NODE_ENV=production), listed it in `buildspec.yml` artifacts, documented in `.env.example`. | A console-set EB env property **overrides** the file — check it; satisfy the prod-gated requirements (below) before flipping; commit + deploy; verify. |
| 3 | Duplicate phones / unique index | Dev has **0 duplicates**. Real blocker found: a stale non-unique `phone_1` index — Mongoose's `createIndex({unique})` was rejected (IndexOptionsConflict) and **silently swallowed**, so BUG-017's fix had never taken effect. Ran `syncIndexes()` on dev → `phone_1 unique=true`. Scripts: `src/scripts/checkDuplicatePhones.ts` (read-only), `src/scripts/syncCustomerIndexes.ts` (refuses if duplicates exist or NODE_ENV=production). | Run the same two scripts against **production** (check first; it may hold real duplicates). |
| 4 | "Reseed" | **BUG-024's premise was wrong**: stock exists (56/58 published listings, 40–80% of hotel rooms). My QA hard-coded one sold-out car. Real defect: **orphaned inventory holds** (3 listings) — including a leak **I introduced** in the BUG-002 guard (`return next()` inside the try that rolls back holds) → fixed (`throw`), verified no new leak. `src/scripts/addQaInventory.ts` written (dry-run default; releases orphaned holds, tops up stock). | Decide on `--apply` (it also raises ~2,200 catalogue counters — your data). **Do not** run `seed:catalogue` (wipes your admin edits, orphans 16 orders) and never `seed:demo` on this cluster. |
| 5 | MaxiCash webhook signature | Verified from the official EN+FR docs and both public SDKs: **MaxiCash publishes no signature, HMAC, secret or callback IP range** — there is no spec to wait for. Code `TODO` reworded accordingly. | Merchant/sandbox credentials; **one sandbox transaction** with `MAXICASH_LOG_RAW=true` to capture the real notify + `PayNowStatus` shapes; then the hardening steps below. |

**Round-2 verification:** backend `tsc` 0 errors · `api.destructive` **6/6** · `api.core` **16/16** (now against a runtime-selected *bookable* listing) · inventory dry-run shows no new leaked hold after the guest-rejection path · `phone_1 unique=true` on dev.

**Harness corrections (my own bugs):** `api.core` picked a sold-out listing by hard-coded id (every order probe 409'd, masking validation) → now resolved at runtime from the admin API; `api.destructive` lacked a retry on the admin search (false passes/fails) and lost evidence on worker restart → retry added, notes write-through to `evidence/api-destructive.jsonl`.

### Step-by-step for the five items

**1 · Rotate, then purge (order matters — purging without rotating leaves the credential valid)**
1. Atlas → Project → Security → Database Access → the exposed user (the name is the part before `:` on line 2 of `.env.minimal`) → *Edit Password → Autogenerate* (or create a least-privilege `readWrite@<db>` user and delete the old one).
2. Security → Network Access: if `0.0.0.0/0` is allowed, replace with your server + dev IPs. Review Database Access History for unknown IPs since 2026-08-12.
3. Set the new `MONGODB_URI` (or `DATABASE_PASSWORD`, see `db.config.ts:15-16`) on **every** host: your laptop `.env`, the EB environment properties, any other dev machine. Restart; hit `/health`.
4. Prove the old one is dead: `mongosh "<old URI>" --eval 'db.runCommand({ping:1})'` → must fail. Then `rm travel-backend/.env.minimal`.
5. Commit **all** your in-progress work in the four repos first (a history rewrite + reset discards anything uncommitted), push.
6. Purge in a **fresh clone**: `brew install git-filter-repo && cd /tmp && git clone <backend-url> tb && cd tb && git filter-repo --invert-paths --path .env.minimal --replace-text /tmp/expr.txt` where `/tmp/expr.txt` holds `regex:mongodb\+srv://[^@\s'"]+@[^\s'"/]*dvfjtgc[^\s'"/]*==>mongodb+srv://****@REDACTED`; verify `git log --all -S'dvfjtgc'` is empty; `git remote add origin <url> && git push --force --all origin`; then in your working copy `git fetch && git reset --hard origin/main`.
7. GitHub still serves old SHAs until purged: open a support ticket ("remove cached views / dangling commits") listing the old SHAs; enable Secret scanning + Push protection.
8. **Mobile (public repo):** `git rm --cached android/app/FlexiAgency.keystore android/keystore.properties`, drop the `!FlexiAgency.keystore` line from `.gitignore`, add `keystore.properties`, `google-services.json`, `GoogleService-Info.plist` to it, commit, purge history the same way, then generate a new upload key (`keytool -genkeypair …`) and in Play Console → App signing → **Request upload key reset** (if Play App Signing is on, only the upload key leaked; if not, enrol now and request an app-signing key upgrade).

**2 · NODE_ENV on Elastic Beanstalk**
1. Check the live value (console-set values override `.ebextensions`): EB → Environment → Configuration → *Updates, monitoring, and logging* → Environment properties, or `aws elasticbeanstalk describe-configuration-settings … --query "…OptionName=='NODE_ENV'"`.
2. Before flipping to production, confirm these are set in EB env properties or the switch itself breaks the app: `PII_ENCRYPTION_KEY` (required in prod, `fieldCrypto.ts:43`), `TRUST_PROXY=1` (behind nginx/ALB), HTTPS on the API origin (cookies become `Secure`/`SameSite=None`), full `ORIGIN` list (loopback CORS bypass turns off).
3. `git add .ebextensions buildspec.yml .env.example && git commit -m "deploy: default NODE_ENV=production (BUG-006)"` → push to the branch CodePipeline watches (or `eb setenv NODE_ENV=production` for an immediate console-level set).
4. Verify: `curl -s https://<api>/api/v1/does-not-exist | jq .` → body must have only `status`, `code`, `message` (no `stack`).

**3 · Unique phone index on production**
1. Point `MONGODB_URI` at prod (read-only step): `npx ts-node src/scripts/checkDuplicatePhones.ts` → expect `Duplicate phone groups: 0`.
2. If 0: `npx ts-node src/scripts/syncCustomerIndexes.ts` (it refuses if `NODE_ENV=production` — run it from a dev shell pointed at the prod URI, or drop/create in Atlas UI: Collections → `platform_customers` → Indexes → drop `phone_1`, create `{phone:1}` unique).
3. If > 0: ask me for the merge script (dry-run default: keep `hasAccount` → most orders → oldest; re-point `Order.customer`/`DeviceToken.customer`; tombstone losers like `deleteMe()`).

**4 · Inventory (instead of reseeding)**
1. `cd travel-backend && SEED_CONFIRM=1 npm run qa:inventory` — review the plan (3 hold releases, 31 listing top-ups, ~2,165 hotel nights raised; `--min`/`--days` adjustable).
2. `SEED_CONFIRM=1 npm run qa:inventory -- --apply` if you're happy with the top-ups (the hold releases alone are pure corrections).
3. Longer term: hotel rate plans end **2026-12-09**; decide a rolling top-up policy (this script on a schedule, or an admin workflow).

**5 · MaxiCash — SUPERSEDED by the round-3 product decision below (cash only, everywhere). Kept for history.**
1. Obtain: merchant account + `MAXICASH_MERCHANT_ID`/`MAXICASH_MERCHANT_PASSWORD`, sandbox access, a public HTTPS `API_PUBLIC_URL` (tunnel is fine for sandbox).
2. Email `info@maxicashapp.com` for, in writing: the NotifyURL payload (method, params, status values, whether the query string is preserved), the `PayNowStatus` response for gateway payments, and any fixed notifier IPs. State plainly there is **no** signing secret to obtain.
3. Run **one** sandbox `PayEntryWeb` payment with `MAXICASH_ENV=sandbox MAXICASH_LOG_RAW=true` and capture the real notify body and `PayNowStatus` response from the server log.
4. Then implement (I can do this once step 3's shapes exist): per-order secret token in the NotifyURL (`?t=<random>`, stored `select:false`, compared with `timingSafeEqual`), fail-closed in `reconcile()` when reference/amount are *missing* (not just mismatched), the documented ASMX `{strData}`/`{d:[…]}` transport for `PayNowStatus`, optional `MAXICASH_NOTIFY_IPS` allow-list; keep `ONLINE_PAYMENTS_ENABLED` unset until then.

---

## Round 3 — cash only everywhere, client handling for the new 409s, mobile fix pass

Product decision (owner, 2026-10-02): **online payments are disabled for good — dev and prod — and cannot be re-enabled by configuration.** This also closes BUG-003 by elimination: there is no reachable webhook or settlement path left.

### Backend — `travel-backend` (verified live, 8 checks)
| Change | Where | Live result |
|---|---|---|
| `onlinePaymentsEnabled()` returns `false` unconditionally; env read deleted | `src/constants/domain.constants.ts` | — |
| Non-CASH `paymentMethod` → **400 `CASH_ONLY`** ("Only cash payment is available."), checked **before** pricing | `controllers/public/orderController.ts` | `paymentMethod:'ONLINE'` → 400 CASH_ONLY (fired before the fake listing could 409) |
| `POST /orders/:ref/pay` with a non-CASH rail → 400 `CASH_ONLY`; CASH unchanged (`OFFLINE`) | `controllers/public/paymentController.ts` | `rail:'CARD'` → 400; `rail:'CASH'` → 200 OFFLINE |
| MaxiCash notify route **removed** (+ its limiter) | `routes/v1/catalogueRouter.ts` | `POST /payments/maxicash/notify` → **404** |
| `GET /orders/:ref/payment` reports the order's own status only — never calls the provider | `paymentController.ts` | `{paymentStatus:'UNPAID', paid:false}` |
| `.env.example`: `ONLINE_PAYMENTS_ENABLED` + `MAXICASH_*` block → comment ("permanently disabled, unused") | `.env.example` | — |
| `maxicash.service.ts`, `maxicashNotify`, `reconcile()`, `settle()` left in place but **unrouted/unreachable** (disable ≠ delete) | — | — |

Scheduled jobs: verified there is **no** payment-reconciliation job (only cash reminders, hold release, publishing, undocumented-order flag, passport purge, listing expiry, inventory drift) — nothing to change. Cash order created end-to-end (201, SUBMITTED/UNPAID) and cleaned up. tsc 0.

### Website — `travel-frontend`
- **Cash only:** `ONLINE_PAYMENTS_ENABLED` is a compiled `false` (never env-derived); `lib/checkout.tsx confirm()` always sends `paymentMethod:"CASH"`; the payment step shows a single static cash tile and the CTA reads "Réserver et payer en agence / Reserve and pay at the office"; the rails radio list, mobile-money operator select, PCI note and provider-redirect branch are gone; restaurants checkout shows a static "Espèces à la livraison / Cash on delivery" line; `/booking/payment/return` now only redirects (to the confirmation if a reference exists, else home).
- **New 409 codes handled in both checkouts:** `ACCOUNT_EXISTS` → translated message + **Sign in** link to `/login?next=<current page>` (checkout state survives in sessionStorage); `IDEMPOTENCY_KEY_USED` → mint a fresh key and retry once. `ORDER_CANCELLED` / `CURRENCY_CHANGED` handling unchanged.
- **Root cause fixed underneath:** `createOrder()` in `lib/api.ts` never passed the server `code` into `ApiError` (so no client could switch on it) **and** lacked `credentials:"include"` (every other call has it) — after a sign-in round-trip the session cookie would not have reached `POST /orders`, and `ACCOUNT_EXISTS` would have repeated forever.
- Account sign-in prompt now carries `?next=`. tsc 0; `/booking/payment`, `/restaurants/checkout`, `/booking/payment/return` → 200.

### Mobile — `travel-application` (12 items; tsc 0)
| # | Fix | Where |
|---|---|---|
| 1 | Session integrity: `api.ts` fires a registered `onSessionInvalid` on 401 → `session.tsx` sets `customer=null` and removes `my-orders`/`order` queries; `signOut()` does the same; sign-out button has a busy flag (no double fire) | `lib/api.ts`, `lib/session.tsx`, `screens/AccountScreen.tsx` |
| 2 | Offline launch: only a 401 signs the user out; network errors keep the token and state | `lib/session.tsx` |
| 3 | Error states with Retry: Order (no more eternal skeleton), Trips, Results, Saved (404 vs error), Explore rails (one-line error instead of blank) | `screens/*` |
| 4 | Checkout: cart cleared only after the order exists **and** navigation to Order; dead online branch removed; `IDEMPOTENCY_KEY_USED` → fresh key + retry; `ACCOUNT_EXISTS` → message + **Sign in** (returns to the still-filled form). Booking: key in a `useRef`, regenerated after any server-answered failure (kept on network errors so a dropped response still replays), same 409 handling | `screens/CheckoutScreen.tsx`, `screens/BookingScreen.tsx` |
| 5 | Traveller ID bound to `documentNumber` (was the read-only `documentNumberMasked` — the same misnamed field as the web bug), `documentType` defaults to PASSPORT | `screens/BookingScreen.tsx` |
| 6 | Crash/robustness: `openExternal()` helper (12 unguarded `Linking.openURL` sites), optional chaining on office phone/WhatsApp, Splash `.catch` + idempotent `finish()` + backstop timeout | `lib/openExternal.ts`, `AccountScreen`, `ListingSheet`, `LocationMap`, `ExploreScreen`, `Splash` |
| 7 | Login stores `email` | `screens/LoginScreen.tsx` |
| 8 | Enquiry idempotency key minted once per sheet session (retries no longer duplicate) | `components/sheets/EnquirySheet.tsx` |
| 9 | Deep links: Android `VIEW` intent-filters for `flexiagency://` and https `flexiairbnb.com` (autoVerify); iOS `associated-domains` entitlement. **Ops:** host `/.well-known/apple-app-site-association` and `assetlinks.json`, enable Associated Domains on the App ID | `AndroidManifest.xml`, `FlexiAgency.entitlements` |
| 10 | Secrets (non-destructive): `!FlexiAgency.keystore` un-ignore removed; `keystore.properties`, `google-services.json`, `GoogleService-Info.plist` gitignored; keystore + properties `git rm --cached` (files kept on disk). **Keys not rotated** (ops; still in history until purged) | `.gitignore` |
| 11 | Dev API host: Android `10.0.2.2:3001`, iOS `localhost:3001`, optional `DEV_LAN_HOST` override; release host unchanged | `lib/config.ts` |
| 12 | Minimum order compared in the selected currency when the zone carries it | `screens/CheckoutScreen.tsx` |

`ONLINE_PAYMENTS_ENABLED` is a compiled literal `false` and no online rail or hand-off remains on the money path; the backend's 400 `CASH_ONLY` means even an old build in someone's pocket books cash. Pre-existing, not fixed: `npx jest` fails on the template `App.test.tsx` because `jest.config.js` does not transform `@react-navigation` ESM.

### Device QA (iOS simulator, Maestro) — see the next section for results
Two environment findings worth knowing before anyone repeats this:
- **`react-native run-ios` is broken under Xcode 27**: the RN CLI hardcodes `Xcode.app/Contents/Developer/Applications/Simulator.app`, which no longer exists, so it throws *before building* yet exits 0. Use `xcodebuild … -configuration Debug -sdk iphonesimulator` + `xcrun simctl install/launch` (what the QA run does).
- Because of that, the simulator still carried a **Sep 1 Release build with an embedded `main.jsbundle`** — the first smoke pass unknowingly ran month-old JavaScript. Always check the installed app's binary date / absence of `main.jsbundle` before trusting a simulator run.

### Device QA results — iPhone 17 Pro Max simulator (iOS 26.5), Maestro 2.11, fresh Debug build on your Metro

| Flow (`qa/mobile/*.yaml`) | Result | Evidence (`qa/evidence/mobile/`) |
|---|---|---|
| `smoke` — launch, all four tabs render with live data | **PASS** | `mobile-01…05` |
| `login` — idempotent sign-out → sign in as +91 7044804030 → iOS "Save Password?" + push prompt dismissed → signed-in Account → Trips | **PASS** | `mobile-10…13` |
| `checkout-cash` — signed in: menu → add → basket → form → zone → terms → "Commander — payer à la livraison" → Order screen | **PASS** — **cash is the only payment option on-device**; a real US$45 cash order was created and then cancelled | `mobile-20…27` |
| `guest-account-exists` — sign out → guest order using a *registered* phone | **PASS after a fix** — now refused with the sign-in prompt; before the fix the order was accepted and attached to the account (see BUG-031) | `mobile-30…31` |

**Found and fixed on device**
- **BUG-031 (High) — sign-out did not end the session.** `signOut()` cleared the Keychain token but never called `POST /auth/logout`, and the backend also sets an httpOnly `ct_session` cookie at login that iOS's native cookie jar re-sent on every `fetch`. The backend authenticates from Bearer *or* cookie, so every "signed-out" request was still authenticated: a guest order with the account's phone was accepted and attached (`FA-D1SPN-654H3`, cancelled), and the next launch's `me()` would have signed the previous user back in. **Fix:** `credentials: "omit"` on the app's fetch (`lib/api.ts` — the Bearer token is the only credential, so sign-out holds even offline) and `logout()` called before the token is dropped (`lib/session.tsx`), which also revokes the token server-side via the BUG-016 `tokensValidFrom` stamp. Re-verified on device: the same flow is now refused.

**Found, filed, not fixed**
- **BUG-032 (Medium, accessibility)** — the delivery-zone bottom sheet's rows ("Himbi", "Katindo") are not in the accessibility tree; the container exposes only "Bottom Sheet" / "Bottom sheet handle" / "backdrop". VoiceOver users cannot choose a zone (and automation must tap by position). `components/ui/Sheet.tsx` (`@gorhom/bottom-sheet`) as used by the CheckoutScreen zone picker — likely an `accessible`/`accessibilityLabel` on the container collapsing its children.
- **BUG-033 (Low, i18n)** — server error text is shown raw and unlocalised in the checkout: "Too many checkout attempts, please try again later" inside the French UI (`CheckoutScreen` renders `err.message`; map known codes to i18n strings).

**Re-running the mobile suite:** build with `cd travel-application/ios && xcodebuild -workspace FlexiAgency.xcworkspace -scheme FlexiAgency -configuration Debug -sdk iphonesimulator -destination "id=<udid>" build`, then `xcrun simctl install booted <DerivedData>/…/Debug-iphonesimulator/FlexiAgency.app`, keep Metro running, and from `qa/evidence/mobile` run `~/.maestro/bin/maestro test ../../mobile/<flow>.yaml` in the order smoke → login → checkout-cash → guest-account-exists. `POST /orders` is limited to 20/hour per IP, so restart the backend between full runs; cancel the created test orders afterwards (`qa_test` address).

### Notification routing — cash reminders are now push-first (owner decision, 2026-10-03)
Previously `CASH_DEADLINE_REMINDER` and `ORDER_CANCELLED` were **SMS-always** (sent SMS even when the app held an active push token). The office chose push-first for cash reminders, so:
- `travel-backend/src/services/notifications/notify.service.ts`: removed `CASH_DEADLINE_REMINDER` from `SMS_EVEN_WITH_APP` (only `ORDER_CANCELLED` remains). Extracted the rule into an exported, testable `smsAfterPush(event, pushed)` and used it in the send decision.
- **Effect:** a customer with the app installed and a reachable device gets the cash reminder by **push only**; SMS fires solely as a fallback when push cannot be delivered (no device token, token stale >7 days, or Firebase/FCM failure). Order cancellations are unchanged (still SMS-always).
- **Tradeoff (accepted):** if the OS has notifications silenced, FCM still reports the push as delivered, so no SMS safety net fires for that one booking-critical message. `ORDER_CANCELLED` was deliberately left SMS-always for that reason.
- **Verification:** `travel-backend/src/scripts/checkSmsRouting.ts` (no DB, no sends) asserts the full truth table; `npx tsc` 0 errors. Production push is confirmed configured by the owner, and the live logs already show `PUSH SENT 1 of 1 device(s)`, so prod cash reminders will now route push-first. The inflated historical SMS counts (e.g. `ORDER_CONFIRMED` 10 SMS vs 6 push) were the **local dev backend during QA**, which had Twilio configured but not Firebase — not a production leak.
