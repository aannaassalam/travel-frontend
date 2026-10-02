# QA SUMMARY — Flexi Agency / CongoTravel

> **Update:** all web/admin/backend findings have been fixed and re-verified (api.core 16/16, api.destructive 6/6, 360 px overflow 7/7, 0 type errors in all three repos). Details and remaining human actions in [FIXES.md](FIXES.md).

Audit date: 2026-10-02 · Auditor: automated QA pass (Playwright + direct API probes + full code review of all four repos).

## Totals

**Bugs by severity:** 30 total

| Severity | Count | IDs |
|---|---|---|
| 🟥 Critical | 6 | BUG-001…006 |
| 🟧 High | 8 | BUG-007…014 |
| 🟨 Medium | 12 | BUG-015…026 |
| 🟦 Low | 4 | BUG-027…030 |

**Checklist:** ~70 items. Roughly 20 ✅ Pass (verified live), 14 ❌ Fail (each tied to a BUG reproduced or confirmed), ~28 ⚠️ code-confirmed (traced but not executed live for safety), ~8 ⏭️ Skipped (no emulator, no live SMS/payment, no bookable stock).

**Reproduced live (against the dev DB):** BUG-001 (partial — see below), 002, 006, 007, 008, 009, 010, 013, 014, 015, 020, 021, 024, 027 (plus 030 on the handler path). The remaining items are code-confirmed with exact file:line and safe repro steps.

The destructive repros were run after you confirmed the DB is dev and restarted the backend (clearing the in-memory `checkoutLimiter`, 20/hour). All writes were isolated to `qa_test_` listings/orders; the overwritten test account was restored, and every `qa_test_` order was cancelled and listing archived — verified clean at the end.

**One claim corrected (BUG-001):** the "double-click double-*sells* stock" framing did not hold. Cash-received on a CANCELLED order **does** revive it to CONFIRMED/PAID with no reservation, and a second call returns 200 and re-notifies (no status guard, not idempotent) — both reproduced. But `quantitySold` did **not** double-increment for a single listing order, because of the `quantityHeld >= qty` guard; the cross-order double-decrement risk survives only on the shared rate-plan path with concurrent holds (code-suspected, not reproduced). BUG-001 stays Critical on the revive-cancelled behavior.

## Why some bugs were not executed live

Your standing project note says `travel-backend/.env` points at the **production Atlas cluster** ("never seed, mark and delete test docs"). During this run your messages said to treat it as dev. The live admin error leaks the Atlas cluster signature, which matches the "Atlas" note — so rather than silently overwrite a safety record, I kept to safe tests: read-only calls, inputs a correct server must reject, and reversible `qa_test` orders (cancelled afterward). I did **not** run repros that corrupt shared inventory counters, overwrite a real customer account, send SMS, write settings, or publish catalogue. **Please confirm whether this DB is production or dev** — if it's a throwaway dev DB, I can run the destructive repros (cash double-fire, guest-overwrite, mass-assignment) to turn the ⚠️ items into ❌ reproduced.

## Top 5 risks to fix before release

1. **BUG-001 — Cash-received has no guard.** A double-click (or retried request) on "Mark cash received" sells the same stock twice and eats other customers' holds; it also resurrects cancelled orders as paid. This is a daily-use admin button with no confirm and no busy state. Money/stock integrity.
2. **BUG-002 — Guest checkout hijacks accounts.** Anyone can overwrite a real customer's name (and email) and file orders into their history just by typing their phone number at guest checkout. Data integrity + privacy.
3. **BUG-004 / BUG-005 — Committed secrets.** A live MongoDB URI with credentials (backend) and the Android release keystore + passwords (mobile) are in git history. Rotate both now; they grant full DB and app-signing access.
4. **BUG-006 / BUG-007 — Information disclosure.** Every error returns a full stack trace with server paths because `NODE_ENV=development`, and admin search with a regex metacharacter returns a 500 leaking MongoDB Atlas cluster internals. Set `NODE_ENV=production` and escape `$regex` input.
5. **BUG-003 — Payment settlement trusts the client/webhook.** The MaxiCash notify webhook is unsigned and settlement never checks amount/currency, so a cheap payment can mark an expensive order PAID. Latent today (online payments off) but must be fixed before enabling online pay.

Runner-up worth noting: **BUG-008/014** (no server-side date or contact/traveller validation) and **BUG-024** (zero bookable seed inventory blocks every end-to-end booking — fix this first just to make the app demoable/testable).

## What was NOT tested, and why

- **End-to-end booking & payment** — all seed listings are sold out (BUG-024), so no order can complete; online payments are disabled by config. Covered by code review + partial API probes.
- **Mobile app on device** — no emulator/simulator in this environment and no Maestro/Detox config. Covered by code review + the shared API. Needs a real device/emulator pass.
- **OTP / SMS flows and `notifications/test`** — not exercised to avoid sending real SMS (hard rule 2).
- **Destructive security repros** (cash double-fire, account overwrite, mass-assignment, settings writes, catalogue publish) — not run against the shared/production DB; documented from code with repro steps.
- **Load / DoS** (100mb body limit, rate-limit bypass via `TRUST_PROXY`) — noted from code, not stress-tested.

## How to re-run the automated suite

```bash
cd travel-frontend/qa
npm install                      # once
npx playwright install chromium  # once

# all projects
npx playwright test

# individually
npx playwright test web.crawl   --project=desktop --project=mobile --project=tablet
npx playwright test api.core    --project=api --workers=1
npx playwright test web.repro   --project=desktop

npx playwright show-report evidence/report   # HTML report
```

Evidence: `qa/evidence/` — `crawl-*.json` (per-route status/overflow/console), `api-core.json` (API probe log + cleaned-up refs), `crawl/` and `repro/` screenshots, `test-results/` traces on failure.

Note: `api.core` logs in as the test accounts and creates `qa_test_`-prefixed orders, cancelling them in `afterAll`. Reads are rate-limited to 300/15min per IP, so back-to-back full runs may hit 429s — wait or run fewer projects.
