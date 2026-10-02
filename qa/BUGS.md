# BUGS — Flexi Agency / CongoTravel pre-release audit

> **Fix status:** every web/admin/backend item below has since been fixed and regression-verified — see [FIXES.md](FIXES.md) for the change per bug, verification evidence, and the handful of items that still need a human (credential rotation, `NODE_ENV`, duplicate phones, reseed).

Date: 2026-10-02. Backend reachable at `localhost:3001` with `NODE_ENV=development`.
"Reproduced" = triggered against the running stack. "Code-confirmed" = traced to exact source with a certain mechanism but not executed live, because the live backend shares the production Atlas cluster (per standing project note) and the repro would corrupt shared inventory/customer data. Safe repro steps are given for each so they can be run in an isolated DB.

Legend: 🟥 Critical · 🟧 High · 🟨 Medium · 🟦 Low

---

### BUG-001 — Admin "Mark cash received" has no status guard and is not idempotent; revives cancelled orders to PAID
- **Severity:** Critical
- **Area:** Admin booking detail → cash received; `POST /admin/v1/orders/:id/cash-received`
- **Platform:** API / Admin
- **Where in code:** `travel-backend/src/controllers/admin/orderController.ts:486-523`; client `admin/pages/bookings/[id].tsx:700-707` (button has no `disabled`, no confirm)
- **Steps to reproduce:**
  1. Create a cash order.
  2. POST cash-received twice.
  3. Cancel another cash order, then POST cash-received on it.
- **Expected:** Second call rejected; a CANCELLED order refuses cash; the order moves to PAID exactly once.
- **Actual:** No check on `status`/`paymentStatus`. **Reproduced:** on a CANCELLED order, cash-received returned 200 and revived it to `status=CONFIRMED`, `paymentStatus=PAID` with no stock reservation (a path to overselling). A second cash-received on an already-paid order also returned 200 (not rejected) and re-ran the flow, re-sending the customer a "payment received" notification. `quantitySold` did **not** double-increment for a single listing order — the `quantityHeld >= qty` guard blocks the second decrement — so the double-*count* risk is limited to the shared rate-plan path (`updateMany({_id:{$in:heldIds}, held:{$gte:qty}})`) where a concurrent other-order hold could be decremented (not reproduced; needs hotel rate plans + concurrent holds).
- **Evidence:** reproduced — `/tmp/qa_verify.mjs` output: cancelled-order cash → `{cashStatus:200, finalStatus:"CONFIRMED", finalPayment:"PAID", revived:true}`; double call → `{c1:200, c2:200, sold:[0,1,1]}`.
- **Reproducible:** Always (revive-cancelled + non-idempotent); double-sell on rate plans: Code-suspected
- **Suggested fix:** Guard on `status==='SUBMITTED' && paymentStatus==='UNPAID'`; make the stock conversion a single conditional `updateOne`; disable the button while pending and add a confirm.

### BUG-002 — Guest checkout overwrites an existing account holder's name and attaches the order to them
- **Severity:** Critical
- **Area:** `POST /api/v1/orders` (guest)
- **Platform:** API / Web / Mobile
- **Where in code:** `travel-backend/src/controllers/public/orderController.ts:345-352`
- **Steps to reproduce:**
  1. As a guest (no auth), create an order whose `contact.phone` equals a real customer's phone and `contact.firstName`/`lastName` set to anything.
  2. Log in as that customer and open `/me/orders` and the profile.
- **Expected:** A guest cannot modify a registered account or file orders into it by typing its phone number.
- **Actual:** `Customer.findOneAndUpdate({phone}, {$set:{firstName,lastName,email?}}, {upsert:true})` rewrites the real account's name (and email if supplied) and the order appears in the victim's order history. `contact.email` is unvalidated.
- **Evidence:** reproduced — `/tmp/qa_verify.mjs`: a guest order with the test customer's phone changed the account name `Anas` → `qa_test_OVERWRITE` and the order appeared in that account's `/me/orders` (`{overwritten:true, attached:true}`). Account restored afterward.
- **Reproducible:** Always
- **Suggested fix:** Never `$set` identity fields on an existing customer during checkout; only `$setOnInsert`. Match signed-in customers by session only (already done); for guests, store contact on the order, not the customer record.

### BUG-003 — Payment notify webhook is unsigned and settlement verifies no amount/currency
- **Severity:** Critical (latent — online payments disabled today)
- **Area:** `ALL /api/v1/payments/maxicash/notify`, settlement
- **Platform:** API
- **Where in code:** `travel-backend/src/controllers/public/paymentController.ts:158-174, 385-449`; `services/payments/maxicash.service.ts:366-400`
- **Steps to reproduce (staging, online payments on):**
  1. Pay a cheap order to get a valid PmtID.
  2. POST the notify URL with `?reference=<expensive order>&PaymentID=<cheap PmtID>` before the genuine callback.
- **Expected:** Webhook authenticity verified (signature/HMAC) and provider amount compared to `order.chargedTotal` and currency before marking PAID.
- **Actual:** No signature check; settlement never compares amount/currency; reference match is skipped when the provider returns none. Also `maxicash.service.ts:381` treats the API-call status as the payment status, so a pending/failed PmtID can read as PAID.
- **Evidence:** code-confirmed. `ONLINE_PAYMENTS_ENABLED=false` today, so not reachable live.
- **Reproducible:** Code-confirmed
- **Suggested fix:** Verify webhook signature; re-fetch the payment from MaxiCash and compare amount+currency+reference before settling; distinguish call-status from payment-status.

### BUG-004 — Live MongoDB connection string with credentials committed to the backend repo
- **Severity:** Critical
- **Area:** Secrets
- **Platform:** API
- **Where in code:** `travel-backend/src/dev-data/data/import-dev-data.ts:7` and `.js:44` (in git history since `344b1bd`)
- **Steps to reproduce:** `git log -p` the file; a `mongodb+srv://user:pass@cluster1.dvfjtgc...` URI is present.
- **Expected:** No credentials in source.
- **Actual:** Full Atlas URI with username/password hardcoded.
- **Evidence:** reported by code map; corroborated — the live admin error at `GET /admin/v1/customers?q=[` leaks the Atlas `$clusterTime`/`signature`, confirming a real Atlas cluster is in use.
- **Reproducible:** Code-confirmed
- **Suggested fix:** Rotate the credentials now; move to env; purge from history; add to `.gitignore`.

### BUG-005 — Android release keystore and its passwords committed to the mobile repo
- **Severity:** Critical
- **Area:** Secrets / release signing
- **Platform:** Mobile
- **Where in code:** `travel-application/android/keystore.properties` (tracked), `android/app/FlexiAgency.keystore` (explicitly un-ignored in `.gitignore`), committed in `ed7d62c`
- **Expected:** Signing material never committed.
- **Actual:** `storeFile`, `storePassword`, `keyAlias`, `keyPassword` and the keystore are in the repo, despite `build.gradle:79` claiming it is gitignored.
- **Evidence:** code map.
- **Reproducible:** Code-confirmed
- **Suggested fix:** Rotate the signing key, remove from history, gitignore both files.

### BUG-006 — Every error response leaks a full stack trace and absolute server paths (and MongoDB cluster internals)
- **Severity:** Critical (information disclosure)
- **Area:** Global error handler
- **Platform:** API
- **Where in code:** `travel-backend/src/controllers/errorController/errorController.ts:24-34` (dev branch); reachable because `NODE_ENV=development`
- **Steps to reproduce:**
  1. `curl -s localhost:3001/api/v1/auth/me -H 'Authorization: Bearer abc.def.ghi'`
  2. `curl -s 'localhost:3001/admin/v1/customers?q=%5B' -H 'Authorization: Bearer <admin>'`
- **Expected:** Production error body `{status, code, message}` with no stack.
- **Actual:** Bodies include `"stack":"Error: ... at /Users/.../travel-backend/src/controllers/public/orderController.ts:305"` on ordinary 401/409, and the admin regex error returns raw MongoDB `{$clusterTime, signature:{hash,keyId}, operationTime}`.
- **Evidence:** reproduced — `qa/evidence/api-core.json` (garbage-jwt), and the curl outputs captured in the session.
- **Reproducible:** Always
- **Suggested fix:** Set `NODE_ENV=production` on deployed envs; never include `stack`/raw driver errors outside local dev; map unknown DB errors to a generic 500.

### BUG-007 — Admin search `?q=` is an unescaped `$regex`: 500 error, ReDoS surface, and Mongo internals leaked
- **Severity:** High
- **Area:** `GET /admin/v1/customers`, `GET /admin/v1/locations`
- **Platform:** API / Admin
- **Where in code:** `travel-backend/src/controllers/admin/customerController.ts:25-28`, `admin/locationController.ts:43`
- **Steps to reproduce:** `curl 'localhost:3001/admin/v1/customers?q=%5B' -H 'Authorization: Bearer <admin>'` (also `(` on locations).
- **Expected:** `q` escaped/validated; malformed input → empty result or 400.
- **Actual:** 500 with MongoDB error `Location51091` and cluster signature leaked; a catastrophic pattern (`(a+)+`) would pin CPU.
- **Evidence:** reproduced — 500 captured; see BUG-006 evidence.
- **Reproducible:** Always
- **Suggested fix:** Escape the user string before `new RegExp`, or use `$text`/anchored prefix; cap length.

### BUG-008 — Orders accept reversed, past, and invalid dates (no server-side date validation)
- **Severity:** High
- **Area:** `POST /api/v1/orders` pricing
- **Platform:** API / Web / Mobile
- **Where in code:** `travel-backend/src/services/orders/pricing.service.ts:54-67` (listing) and `:98-116` (stay) — no past/reversed/max-length check; `nightsBetween` clamps to ≥1
- **Steps to reproduce:** POST an order with `startDate:"2026-11-12", endDate:"2026-11-10"` (or `2020-01-01`, or `"not-a-date"`).
- **Expected:** 400 at validation.
- **Actual:** Dates pass validation and pricing; the request only fails later at the stock-hold step (`orderController.ts:305` "That just sold out"), proving no date guard. With stock, a reversed/past-dated order would be created and priced (1 night).
- **Evidence:** reproduced — reversed/past/garbage dates all reached line 305 (409) instead of 400; `qa/evidence/api-core.json`. Full end-to-end create blocked only because all seed inventory is sold out (see BUG-024).
- **Reproducible:** Always
- **Suggested fix:** Validate `startDate >= today`, `endDate > startDate`, max stay length, and real calendar dates before pricing.

### BUG-009 — Idempotency-Key is client-chosen and global, not scoped to the caller
- **Severity:** High
- **Area:** `POST /api/v1/orders`
- **Platform:** API
- **Where in code:** `travel-backend/src/controllers/public/orderController.ts:122-165`
- **Steps to reproduce:** Create an order with key K; from a different caller POST again with the same K.
- **Expected:** Replay only returns the original to the original caller.
- **Actual:** Any caller replaying K gets a 200 with the first order (reference, travellers, DOB, masked phone). The reference is itself the read capability (BUG elsewhere). Two concurrent same-key requests both hold stock; the loser gets E11000 mapped to a 400 "already used" instead of a replay.
- **Evidence:** reproduced — `/tmp/qa_verify.mjs`: a guest created an order with key K; the **signed-in test customer** replaying K received the guest's order back (same reference `FA-CF0CP-M6NS9`, `sameOrder:true`).
- **Reproducible:** Always
- **Suggested fix:** Namespace the key by customer/session (or hash of body) and reject cross-identity reuse.

### BUG-010 — Admin create/update spreads `req.body` (mass assignment)
- **Severity:** High
- **Area:** Admin inventory (hotels, listings, restaurants, room-types, menu)
- **Platform:** API / Admin
- **Where in code:** `listingController.ts:189,237`; `hotelController.ts:81,97,190,203`; `restaurantController.ts:92,107,183,195`
- **Steps to reproduce:** `POST /admin/v1/listings` with `status:"PUBLISHED"`, `quantitySold`, `vertical:"HOTEL"`, `slug`, `rating`, `createdBy` in the body.
- **Expected:** Only whitelisted fields accepted; publish goes through `publishBlockers`; counters/slug server-controlled.
- **Actual:** `{...req.body}` is passed to create/update, letting a writer set publication status (bypassing publish checks), rewrite `quantitySold`/`quantityHeld`, change `vertical`/`slug`/`rating`, etc.
- **Evidence:** reproduced — `qa/tests/api.destructive.spec.ts` created a listing with body `{status:"PUBLISHED", quantitySold:777}`; the admin GET confirmed it stored `quantitySold=777` and `status=PUBLISHED`, and a `PATCH {vertical:"HOTEL"}` flipped the vertical. `qa/evidence/api-destructive.json`. (A `rating:9.9` in the same body was rejected by a schema max — rating is not mass-assignable.)
- **Reproducible:** Always
- **Suggested fix:** Pick explicit allowed fields per model; keep status/counters/slug/vertical off the input path.

### BUG-011 — Open redirect after login via unchecked `?next`
- **Severity:** High
- **Area:** `/login`
- **Platform:** Web
- **Where in code:** `travel-frontend/pages/login.tsx:145` (`router.push(String(router.query.next || "/account"))`)
- **Steps to reproduce:** Visit `/login?next=https://example.com/x`, sign in with the test customer.
- **Expected:** Only same-origin relative paths honored.
- **Actual:** `next` is pushed unchecked; `https://…` / `//evil` sends the user off-site after auth (`javascript:` should be checked too). Admin does validate this (`admin/pages/login.tsx:60-70`), the customer site does not.
- **Evidence:** code-confirmed; UI repro inconclusive (login flow timing) — screenshot `qa/evidence/repro/open-redirect.png`.
- **Reproducible:** Code-confirmed
- **Suggested fix:** Accept `next` only if it starts with a single `/` and not `//`.

### BUG-012 — Passport / ID numbers entered at checkout are silently dropped
- **Severity:** High
- **Area:** Booking travellers
- **Platform:** Web
- **Where in code:** `travel-frontend/pages/booking/travellers.tsx:127-129` writes `documentNumberMasked`; `lib/checkout.tsx:301` sends travellers as-is; backend expects `documentNumber` (`travel-backend/src/model/orderModel.ts:30`, `select:false`, encrypted)
- **Steps to reproduce:** Complete a flight booking entering a passport number; inspect the created order / admin unmask.
- **Expected:** The document number is stored (encrypted).
- **Actual:** Field name mismatch → Mongoose strict mode drops it; `documentType` is `undefined` unless changed. Operations never receive passport data required for ticketing.
- **Evidence:** code-confirmed (cross-repo field mismatch); not run live (needs bookable stock).
- **Reproducible:** Code-confirmed
- **Suggested fix:** Send `documentNumber`/`documentType`; add a server check that flight travellers include them.

### BUG-013 — Settings accept negative/zero values with no bounds (passport purge, holds)
- **Severity:** High
- **Area:** `PATCH /admin/v1/settings`
- **Platform:** API / Admin
- **Where in code:** `travel-backend/src/controllers/admin/opsController.ts:554-557`; `model/settingsModel.ts:93-101` (no min/max); client `admin/pages/settings.tsx:306` (`Number("")→0`)
- **Steps to reproduce:** Step-up, then `PATCH /settings {holdTtlCashHours:-5}` or `{passportRetentionDays:-1}`; or clear a numeric field in the UI and save.
- **Expected:** Range-validated.
- **Actual:** Persists negatives/zeros. A negative/zero `passportRetentionDays` makes the nightly purge delete all stored passport data; `holdTtlCashHours:0` expires every cash hold immediately. Clearing a field in the UI saves `0`.
- **Evidence:** reproduced — after step-up, `PATCH /admin/v1/settings {holdTtlCashHours:-5}` returned 200 and stored `-5` (original 48 restored afterward). `qa/evidence/api-destructive.json` (`settings-negative`).
- **Reproducible:** Always
- **Suggested fix:** Add min/max in schema and controller; treat empty UI input as "unchanged", not 0.

### BUG-014 — Order contact/traveller fields are not validated server-side
- **Severity:** High
- **Area:** `POST /api/v1/orders`
- **Platform:** API
- **Where in code:** `travel-backend/src/controllers/public/orderController.ts:330, 403-405`
- **Steps to reproduce:** POST an order with `contact.email:"nope"`, `contact.lastName:"x".repeat(5000)`, traveller `{firstName:{$gt:""}, lastName:["a"], dateOfBirth:"2030-01-01"}`.
- **Expected:** 400.
- **Actual:** Passes validation and pricing (reaches the sold-out stock check), so a 5000-char name, invalid email, future DOB and non-string (object/array) traveller names would be stored. A `documentNumber` beginning `enc:v1:` is stored unencrypted (`fieldCrypto.ts:35`).
- **Evidence:** reproduced — reached line 305 (409) rather than 400; `qa/evidence/api-core.json`.
- **Reproducible:** Always
- **Suggested fix:** Validate email format, field lengths, DOB ≤ today, and that names are strings before pricing.

### BUG-015 — Enquiry endpoint accepts invalid email and unbounded name
- **Severity:** Medium
- **Area:** `POST /api/v1/enquiries`
- **Platform:** API / Web
- **Where in code:** `travel-backend/src/controllers/public/enquiryController.ts:36` (email unvalidated, `customerName` no max, `listingLabel` unbounded)
- **Steps to reproduce:** `POST /enquiries {customerName:"<10k chars>", email:"not-an-email", phone, message}`.
- **Expected:** 400.
- **Actual:** 201 `{reference}` created with a 10k-char name and bogus email.
- **Evidence:** reproduced — 201 captured (`DM-F1EQB-NNF8N`).
- **Reproducible:** Always
- **Suggested fix:** Validate email, cap name/label length.

### BUG-016 — Customer logout does not revoke the bearer token (valid up to 7 days, renewable to 90)
- **Severity:** Medium
- **Area:** `POST /api/v1/auth/logout`
- **Platform:** API / Web / Mobile
- **Where in code:** `travel-backend/src/controllers/public/customerAuthController.ts:485`; comment acknowledging it at `middleware/customerAuth.ts:144-147`
- **Steps to reproduce:** Capture the JSON `token`, call logout, reuse the token on `/auth/me`.
- **Expected:** Logout invalidates the session.
- **Actual:** Only the cookie is cleared; a stolen bearer keeps working until expiry.
- **Evidence:** code-confirmed (stateless JWT, no server store).
- **Reproducible:** Code-confirmed
- **Suggested fix:** Track a token version / `tokensValidFrom` per customer and bump it on logout.

### BUG-017 — Customer phone is not unique → duplicate accounts, arbitrary login match
- **Severity:** Medium
- **Area:** Customer model
- **Platform:** API
- **Where in code:** `travel-backend/src/model/customerModel.admin.ts:50-57` (index, not unique); `customerAuthController.ts:222-224`, `orderController.ts:348`
- **Expected:** One account per phone.
- **Actual:** Concurrent sign-ups / guest upserts create duplicate rows; `login` picks an arbitrary one.
- **Evidence:** code-confirmed.
- **Reproducible:** Code-confirmed
- **Suggested fix:** Unique index on `phone`; upsert with it.

### BUG-018 — `POST /admin/v1/notifications/test` sends SMS to any number; returns raw Twilio error
- **Severity:** Medium
- **Area:** Admin notifications
- **Platform:** API / Admin
- **Where in code:** `travel-backend/src/controllers/admin/opsController.ts:716-781`
- **Expected:** Restricted test target / validated number; no double-send.
- **Actual:** Any holder of `notifications:write` can SMS arbitrary text to any number (paid messages); the client has no double-submit guard (`admin/pages/notifications.tsx:159`), and errors echo raw provider text.
- **Evidence:** code-confirmed (not executed — would send a real SMS, barred by hard rule 2).
- **Reproducible:** Code-confirmed
- **Suggested fix:** Restrict to verified admin numbers, validate E.164, add a rate limit and busy state.

### BUG-019 — OTP lockout resets on resend; attempt count is check-then-increment
- **Severity:** Medium
- **Area:** `POST /api/v1/auth/otp/*`
- **Platform:** API
- **Where in code:** `travel-backend/src/controllers/public/customerAuthController.ts:76 (resend resets attempts), 133-143 (race)`
- **Expected:** Attempt cap per phone across resends; atomic increment.
- **Actual:** A resend after the 60s cooldown zeroes `attempts`, so the 5-try cap is per code, not per phone; parallel guesses can exceed 5.
- **Evidence:** code-confirmed (not brute-forced live).
- **Reproducible:** Code-confirmed
- **Suggested fix:** Per-phone attempt counter with atomic `$inc`; don't reset on resend.

### BUG-020 — Placeholder phone numbers and a fictional agent are live on customer pages
- **Severity:** Medium
- **Area:** Property listing, lead form, contact fallback
- **Platform:** Web
- **Where in code:** `travel-frontend/pages/property/listing/[slug].tsx:209-228` ("Joseph Mukendi", `+243 81 000 00 00`); `components/catalog/LeadForm.tsx:89-112`; `lib/contact.ts:17-27`
- **Steps to reproduce:** Open `/property/listing/terrain-de-2-019-m-ville-basse-matadi-5`.
- **Expected:** Real contact details or none.
- **Actual:** A fictional agent and placeholder phone/WhatsApp (`wa.me/243810000000`) are shown to customers.
- **Evidence:** reproduced — `qa/evidence/repro/placeholder-agent.png` (`placeholder-contact-present: true`).
- **Reproducible:** Always
- **Suggested fix:** Pull from settings; hide the block when no real contact exists.

### BUG-021 — Horizontal overflow at 360px on 7 pages
- **Severity:** Medium
- **Area:** `/contact`, `/login`, `/account`, `/account/bookings`, `/account/profile`, `/account/saved`, `/account/enquiries`
- **Platform:** Web (mobile viewport)
- **Where in code:** account/contact/login layouts (see `components/account/AccountLayout.tsx`, `pages/contact.tsx`, `pages/login.tsx`)
- **Steps to reproduce:** Load each at 360×740; `scrollWidth > clientWidth`.
- **Expected:** No horizontal scroll on mobile.
- **Actual:** Page overflows horizontally.
- **Evidence:** reproduced — `qa/evidence/crawl-mobile.json`, screenshots under `qa/evidence/crawl/mobile*`.
- **Reproducible:** Always
- **Suggested fix:** Constrain fixed-width children; audit paddings/min-widths at 360px.

### BUG-022 — A property (enquiry-only) is bookable through flight/bus/car/activity detail routes
- **Severity:** Medium
- **Area:** `/flights/offer/[slug]` et al.
- **Platform:** Web
- **Where in code:** `travel-frontend/pages/flights/offer/[slug].tsx:31-38` (and bus/cars/activities copies) — no vertical check
- **Steps to reproduce:** Open `/flights/offer/<property-slug>`.
- **Expected:** Wrong-vertical slug → 404 / redirect.
- **Actual:** The property renders on the flight template (duplicate SEO; a BookingBox path for enquiry-only stock). Pricing does reject PROPERTY server-side (`PROPERTY_IS_ENQUIRY_ONLY`), so the risk is mainly wrong UI + duplicate content.
- **Evidence:** code-confirmed; UI booking-control repro inconclusive (`qa/evidence/repro/property-on-flight-route.png`).
- **Reproducible:** Code-confirmed
- **Suggested fix:** Verify `listing.vertical` matches the route; else 404.

### BUG-023 — Restaurant and social-preview images are broken (mediaUrl bypass / doubled origin)
- **Severity:** Medium
- **Area:** Restaurant cards & detail, OG images
- **Platform:** Web
- **Where in code:** `restaurants/index.tsx:227`, `restaurants/[slug].tsx:73,213`, `index.tsx:302`; OG double-origin `components/.../Layout.tsx:54` vs absolute `mediaUrl()` callers
- **Expected:** Uploaded images resolve via `mediaUrl()`/storage origin.
- **Actual:** Restaurant images use raw `/uploads/…` served from the frontend host → 404; OG tags become `https://domainhttps://…`.
- **Evidence:** code map.
- **Reproducible:** Code-confirmed
- **Suggested fix:** Route restaurant images through `mediaUrl()`; don't prefix already-absolute URLs.

### BUG-024 — Orphaned inventory holds are never reconciled (CORRECTED: the original "zero bookable inventory" claim was wrong)
- **Severity:** Medium
- **Area:** Catalogue / orders
- **Platform:** API
- **Where in code:** seed data / inventory counters (`travel-backend/src/scripts/seedCatalogue.ts`)
- **Steps to reproduce:** `GET /admin/v1/listings?limit=100` → every PUBLISHED listing has `quantityTotal - quantitySold - quantityHeld <= 0`; any `POST /orders` returns 409 "That just sold out".
- **Expected:** Some bookable stock for QA/demo.
- **Actual (corrected 2026-10-02):** Stock *was* available — 56 of 58 published sellable listings and 40–80% of hotel rooms per date window. The QA harness had hard-coded one sold-out car, so every probe hit it and the finding was over-generalised. The real defect: **inventory holds leak and are never reconciled** — 3 listings carried held units belonging to no live order (`releaseExpiredCashHolds` only releases holds attached to an order; `reconcileInventoryDrift` only checks sold > total). One leak path was introduced by the BUG-002 fix itself (`return next()` inside the `try` whose `catch` performs `rollback(taken)`) and has been fixed (`throw`).
- **Evidence:** `SEED_CONFIRM=1 npm run qa:inventory` (dry run) lists the orphaned holds; the earlier `available: 0` conclusion came from a single hard-coded listing and the admin DTO not exposing `quantityHeld`. Leak fix verified: after the guest-rejection path runs, no new orphaned hold appears.
- **Reproducible:** Always
- **Suggested fix:** Do **not** reseed (wipes admin edits, orphans orders). Release orphaned holds with `src/scripts/addQaInventory.ts --apply`; add an orphaned-hold check to `reconcileInventoryDrift` using the same live-holds computation so leaks self-heal.

### BUG-025 — Admin state-changing actions lack confirms/double-submit guards; step-up double-Enter fires twice
- **Severity:** Medium
- **Area:** Admin bookings/inventory/content/notifications/users/roles; step-up dialog
- **Platform:** Admin
- **Where in code:** `admin/components/StepUp/useStepUp.tsx:83` (Enter while busy → two retries); publish/duplicate/transition buttons lack pending state (`inventory/hotel/[id].tsx:307`, `bookings/[id].tsx:678-731`, etc.)
- **Expected:** Single submission; confirms on irreversible actions.
- **Actual:** Double Enter in the password dialog runs the action twice (duplicate user/role/temp-password); many publish/transition/cancel buttons have no busy/confirm. Cancel/complete say "cannot be undone" but show no confirm.
- **Evidence:** code map.
- **Reproducible:** Code-confirmed
- **Suggested fix:** Disable confirm while busy; add confirms to irreversible actions; send `version`/`If-Match` for optimistic concurrency.

### BUG-026 — Mobile: expired session still shows signed-in; previous user's data served from cache after sign-out
- **Severity:** Medium
- **Area:** Mobile session/cache
- **Platform:** Mobile
- **Where in code:** `travel-application/lib/api.ts:109` clears token but `lib/session.tsx:91-97` never resets `customer` or clears the react-query cache
- **Expected:** On session-invalid, UI signs out; sign-out clears cached queries.
- **Actual:** Account/Trips keep showing signed-in while calls go out unauthenticated; a second user signing in within `staleTime` (60s) sees the first user's `my-orders`.
- **Evidence:** code map.
- **Reproducible:** Code-confirmed
- **Suggested fix:** On `SESSION_INVALID` reset `customer`; call `queryClient.clear()` on sign-out.

### BUG-027 — `<html lang>` is always "fr" regardless of selected language
- **Severity:** Low
- **Area:** Document / i18n
- **Platform:** Web
- **Where in code:** `travel-frontend/pages/_document.tsx:8`; only updated on manual switch (`lib/prefs.tsx:63`, not on load `:42`)
- **Evidence:** reproduced — `/about` returns `html lang=fr`.
- **Reproducible:** Always
- **Suggested fix:** Set `lang` from the resolved locale on load.

### BUG-028 — Account lists show "empty" during loading and on API error
- **Severity:** Low
- **Area:** `/account`, `/account/bookings`
- **Platform:** Web
- **Where in code:** `travel-frontend/pages/account/index.tsx:16`, `account/bookings.tsx:15` (ignore `isPending`/`isError`)
- **Evidence:** code map; consistent with the crawl (account pages render without error states).
- **Reproducible:** Code-confirmed
- **Suggested fix:** Render loading and error states distinct from empty.

### BUG-029 — Leftover `pages/api/hello` boilerplate in web and admin
- **Severity:** Low
- **Area:** API routes
- **Platform:** Web / Admin
- **Where in code:** `travel-frontend/pages/api/hello.ts`, `admin/pages/api/hello.ts`
- **Evidence:** code map.
- **Reproducible:** Code-confirmed
- **Suggested fix:** Delete.

### BUG-030 — JWT errors map to HTTP 404 in the global error handler
- **Severity:** Low (latent)
- **Area:** Error handler
- **Platform:** API
- **Where in code:** `travel-backend/src/controllers/errorController/errorController.ts:21`
- **Actual:** `handleJWTError` returns 404. Customer/admin auth middleware intercepts most JWT failures as 401 first (confirmed: garbage token → 401), so this is latent, but any JWT error reaching the handler returns a misleading 404.
- **Evidence:** reproduced (handler path returns 404 by code; live auth path returns 401).
- **Reproducible:** Code-confirmed
- **Suggested fix:** Map `JsonWebTokenError` to 401.
