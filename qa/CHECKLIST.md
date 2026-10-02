# CHECKLIST — Flexi Agency / CongoTravel

Status: ✅ Pass · ❌ Fail (BUG-###) · ⚠️ Suspected / code-confirmed · ⏭️ Skipped (reason)

Scope note: the live backend shares the production Atlas cluster (standing project note; corroborated by the Atlas signature leaked in BUG-006/007). Tests were limited to read-only calls, input a correct server must reject, and reversible `qa_test` orders (cancelled afterward). Destructive repros (inventory corruption, account overwrite, SMS sends, settings writes, publishing) were **not executed** and are marked ⚠️ with code citations. All seed inventory is sold out (BUG-024), so no end-to-end booking/payment could run.

## Functional — Auth
- [✅] Customer login happy path (phone+password) — `qa/evidence/api-core.json`
- [✅] Admin login happy path (email+password)
- [❌] Logout revokes the bearer token — BUG-016 (⚠️ code)
- [⚠️] OTP request/verify happy path — ⏭️ not run (would send a real SMS; hard rule 2)
- [❌] OTP attempt cap holds across resend — BUG-019 (⚠️ code)
- [✅] Protected customer endpoints without a token → 401
- [✅] Admin endpoints reject a customer token → 401
- [✅] Customer endpoint rejects an admin token (audience) → 401
- [✅] Garbage/tampered JWT → 401 (not 404 on the live auth path)
- [❌] Error body has no stack on auth failure — BUG-006
- [⚠️] Login timing / user-enumeration — code-confirmed (bcrypt/argon2 skipped for unknown)

## Functional — Forms & validation (client vs server)
- [❌] Order date validation (reversed/past/invalid) — BUG-008
- [❌] Order quantity edge cases (0, -1, 1.5, "abc", 21, null) — ✅ all rejected 400 (server OK; **pass**)
- [✅] Order quantity edge cases rejected server-side
- [❌] Order contact/traveller validation (email, length, DOB, non-string) — BUG-014
- [❌] Enquiry email/name validation — BUG-015
- [✅] Property vertical rejected at order (enquiry-only) — server returns error
- [❌] Malformed JSON / empty body / wrong types → 400 — ✅ all 400 (**pass**)
- [✅] Malformed/empty/wrong-type bodies → 400
- [❌] Admin settings numeric bounds — BUG-013 (reproduced: holdTtlCashHours saved as -5)
- [⚠️] Admin customer PATCH validation — code-confirmed none
- [⚠️] Passport number persisted — BUG-012 (⏭️ needs bookable stock)

## Functional — Booking / checkout flow
- [❌] End-to-end booking completes — BUG-024 (no bookable stock)
- [⚠️] Price computed server-side (not trusted from client) — ✅ code-confirmed (good)
- [⚠️] Refresh / back / deep-link mid-checkout — code-confirmed (sessionStorage survives; back from confirmation → home)
- [⚠️] Double-submit on pay button — code-confirmed gap (`payment.tsx:199` cancel re-enables)
- [⚠️] Restaurant checkout field errors — code-confirmed missing

## State & flow
- [⚠️] Browser back/forward/refresh mid-flow — code-confirmed behavior
- [⚠️] Double-click/double-submit (admin) — BUG-025
- [⚠️] Two tabs conflicting on one record — code-confirmed (no optimistic concurrency on transitions)
- [❌] Session expiry mid-flow (mobile) — BUG-026
- [✅] Deep-link to a mid-flow booking URL without prior steps → redirects to `/`

## Auth & permissions (IDOR / privilege)
- [✅] Protected routes while logged out → 401 (customer + admin)
- [⚠️] Order accessible by reference with no auth — documented design; recorded (reference is the capability)
- [❌] Guest can overwrite/attach to another account by phone — BUG-002 (reproduced: name overwritten + order attached)
- [❌] Idempotency key not scoped to caller (cross-customer disclosure) — BUG-009 (reproduced: replay returned another caller's order)
- [❌] Admin mass assignment via req.body — BUG-010 (reproduced: quantitySold→777, vertical→HOTEL)
- [✅] Lower-privilege/garbage token on admin API → 401
- [❌] JWT error → correct status — BUG-030 (latent 404)

## Payments (cash + latent online)
- [⚠️] Webhook before/after/without redirect, idempotency, tampered amount — BUG-003 (online disabled; code-confirmed)
- [❌] Cash received is guarded/idempotent — BUG-001 (reproduced: revives CANCELLED→PAID, 2nd call 200+re-notify; quantitySold not double-incremented)
- [⏭️] Live payment success/fail/cancel — online payments disabled (`ONLINE_PAYMENTS_ENABLED=false`)

## API robustness
- [✅] Missing Idempotency-Key → 400; bad vertical → 400
- [✅] Huge (10k-char) search param — no 500, returns < 500ms
- [✅] limit=99999 capped to ≤60
- [❌] Catastrophic/invalid regex in admin search — BUG-007 (500 + leak)
- [✅] Rate limiting present (300/15min reads → 429 observed)
- [❌] Error responses carry no stack traces / secrets — BUG-006
- [⚠️] 100mb JSON body limit (DoS surface) — code-confirmed
- [⚠️] notifications/test SMS to arbitrary number — BUG-018 (⏭️ not sent)

## UI / UX (web)
- [✅] All static routes load (200) — `qa/evidence/crawl-desktop.json`
- [✅] No console errors on desktop except expected 401 (auth/me logged-out) / 404 (missing slugs)
- [❌] No horizontal overflow at 360px — BUG-021 (7 pages)
- [✅] No overflow at 768px / 1440px
- [❌] Loading/empty/error states for account data — BUG-028
- [❌] `<html lang>` reflects locale — BUG-027
- [❌] No placeholder/fictional contact data — BUG-020
- [⚠️] Fake/hardcoded hotel reviews — code-cited (`Reviews.tsx:17`); UI repro did not surface them
- [⚠️] Broken restaurant/OG images — BUG-023
- [⚠️] Property bookable via wrong vertical route — BUG-022
- [⚠️] Accessibility (alt text, labels, focus) — code-confirmed gaps (empty alt on thumbnails, map no name)

## Mobile app (React Native)
- [⏭️] On-device/emulator runs — no emulator in this audit; covered by code review + API
- [⚠️] Session expiry / cache after sign-out — BUG-026
- [⚠️] Deep links (Android manifest has no intent-filter; iOS no associated-domains) — code-confirmed
- [⚠️] Offline handling — code-confirmed none (NetInfo absent)
- [⚠️] Committed signing secrets — BUG-005
- [⏭️] WebView payment flows — no WebViews; payment opens externally

## Secrets / config
- [❌] No committed credentials (backend) — BUG-004
- [❌] No committed signing secrets (mobile) — BUG-005
- [⚠️] NEXT_APP_* secrets exposed via next.config env block — code-confirmed risk (only `NEXT_APP_BASE_URL` referenced today)
- [⚠️] Leftover `pages/api/hello` — BUG-029
