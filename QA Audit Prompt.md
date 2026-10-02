# QA Audit Prompt for Claude Code

> Paste everything below the line into Claude Code, run from the project root.
> Fill in the `[[...]]` placeholders first. Delete any section that doesn't apply (e.g. the mobile section for a web-only project).

---

You are acting as a senior QA engineer doing a full pre-release audit of this project. Your job is to **find what breaks and where**, not to fix it. Produce two deliverables: a test checklist and a bug sheet. Work autonomously; only stop to ask me if something below is genuinely blocking.

## Project context

- **Project:** travel-frontend, travel-backend, travel-application, admin — NextJS and React Native project for bookings from a travel agency
- **Stack:** Next.js 14 Pages Router, Node/Express API, MongoDB, React Native (CLI) app
- **Web dev URL:** http://localhost:3000
- **Web dev URL:** http://localhost:3002
- **API base URL:** http://localhost:3001
- **Start commands:** `npm run dev` in frontend and admin, `npm run dev` in backend
- **Test accounts:** role: customer - +91 7044804030 / 12345678 , admin - admin@yopmail.com / 12345678
- **Payment gateway:** cash only

## Hard rules

1. **Never touch production.** Only use the dev/staging URLs and sandbox/test credentials above. If any env var points at a live/production service (payments, email, SMS, database), stop and tell me before running anything.
2. **No real money, no real messages.** Do not complete a live payment or send emails/SMS to real people.
3. **Do not fix bugs** unless I say so later. You may add test files, test config, and test-only dependencies. Do not modify application code.
4. **Do not delete data** you didn't create. Prefix any test data you create with `qa_test_` so it can be cleaned up.
5. **Every bug must be reproduced at least once** before it goes in the bug sheet. If you suspect a bug from reading code but couldn't trigger it, list it separately as "Suspected — not reproduced".

## Phase 1 — Map the application

Before testing anything, read the codebase and build a map:

- Every page/route (web) and every screen (mobile), with which roles can access each.
- Every API endpoint: method, path, auth requirement, request body, response shape.
- Every form and its validation rules (client-side AND server-side — note where they disagree).
- Every external integration (payments, auth, email, storage, maps, webhooks) and where it's called from.
- Every user role and permission boundary.
- State that persists: DB models, sessions, cookies, local storage, caches.

Write this map to `qa/APP_MAP.md`. Keep it factual; it's the basis for the checklist.

## Phase 2 — Build the test checklist

Create `qa/CHECKLIST.md`. For every feature in the map, list test cases covering:

**Functional**

- Happy path for each user flow, end to end.
- Every form: empty submit, each required field missing, invalid formats (email, phone with/without country code, dates), min/max lengths, leading/trailing whitespace, special characters, emoji, very long input (5,000+ chars), HTML/script injection strings.
- Numbers: 0, negative, decimals, very large values, non-numeric strings.
- Dates/times: past dates, today, far future, timezone boundaries, DST, invalid dates.

**State and flow**

- Browser back/forward and refresh mid-flow (especially mid-checkout).
- Double-click / double-submit on every action button.
- Two tabs doing conflicting actions on the same record.
- Session expiry mid-flow; logging out in one tab while active in another.
- Deep-linking directly to a mid-flow URL without the preceding steps.

**Auth and permissions**

- Accessing every protected route/endpoint while logged out.
- Accessing another user's resources by changing IDs in URLs or request bodies (IDOR).
- A lower role calling admin-only endpoints directly via the API, not just via the UI.
- Token tampering, expired tokens, missing tokens.

**Payments** (if applicable)

- Successful payment; failed payment; user cancels; user closes the tab/app mid-payment.
- Webhook/notify callback arriving **before**, **after**, and **without** the user redirect.
- Same webhook delivered twice (idempotency): does the order get fulfilled twice?
- Webhook with a tampered amount/status: is it verified server-side against the gateway?
- Duplicate `transaction_id`; amount below the minimum and above the maximum; currency mismatch.
- Order status is correct after every one of the above.

**API robustness**

- Missing fields, wrong types, extra unknown fields, empty body, malformed JSON.
- Large payloads; rapid repeated calls (is there any rate limiting?).
- Error responses: correct status codes, no stack traces or secrets leaked.

**UI / UX**

- Viewports: 360px mobile, 768px tablet, 1440px desktop. Look for overflow, clipped text, unreachable buttons.
- Loading, empty and error states exist for every data fetch.
- Console errors and warnings on every page; failed network requests; 404 links.
- Basic accessibility: form labels, keyboard navigation, focus visibility, image alt text.
- Language/i18n if applicable (e.g. French text overflowing buttons).

**Mobile app** (if applicable — [[React Native / Expo]])

- Same functional/flow cases as web, on the emulator.
- App backgrounded mid-flow and resumed; killed and reopened.
- Offline / airplane mode during submit; slow network.
- WebView flows (e.g. payment pages): success, failure, cancel, hardware back button.
- Deep links; push notification taps if used.

Mark each checklist item with a status as you go: `✅ Pass`, `❌ Fail (BUG-###)`, `⚠️ Suspected`, `⏭️ Skipped (reason)`.

## Phase 3 — Execute

- **Web:** set up Playwright (install as a dev dependency in a `qa/` folder if not present). Write automated tests for the checklist items that can be automated; run them against the dev URL. Capture screenshots and traces on failure into `qa/evidence/`.
- **API:** test endpoints directly with scripted requests (not only through the UI), since the UI often hides server-side gaps.
- **Mobile:** if an emulator is available, use [[Maestro / Detox]] for the core flows. If not, say so and cover the mobile app via code review + API tests only.
- **Exploratory pass:** after the automated run, spend time actively trying to break the riskiest flows (checkout, auth, anything touching money or other users' data). Note anything odd even if it isn't clearly a bug.
- **Code review pass:** read the code behind each critical flow for things testing alone won't catch: missing server-side validation, unhandled promise rejections, missing `await`, race conditions, secrets in client bundles, missing error handling around external API calls.

## Phase 4 — Deliverables

### `qa/BUGS.md` — the bug sheet

One entry per bug, sorted by severity, using this exact format:

```
### BUG-001 — [short title]
- **Severity:** Critical | High | Medium | Low
- **Area:** [page/screen/endpoint]
- **Platform:** Web | Mobile | API | All
- **Where in code:** `path/to/file.ts:123` (best guess at root cause location)
- **Steps to reproduce:**
  1. ...
  2. ...
- **Expected:** ...
- **Actual:** ...
- **Evidence:** `qa/evidence/bug-001.png` / test name / console output
- **Reproducible:** Always | Intermittent (x/y attempts)
- **Suggested fix:** one or two sentences, no code changes made
```

Severity guide:

- **Critical:** money lost or wrongly charged, data leaked to another user, auth bypass, app unusable.
- **High:** a core flow is broken for some users, or data is corrupted.
- **Medium:** a feature misbehaves but there's a workaround; confusing errors.
- **Low:** cosmetic, minor UX, console noise.

Also export the same bugs as `qa/bugs.csv` (columns: ID, Title, Severity, Area, Platform, File, Steps, Expected, Actual, Reproducible, Suggested fix) so it can be imported into a spreadsheet or Jira.

### `qa/CHECKLIST.md` — updated with final statuses

### `qa/SUMMARY.md`

- Totals: checklist items run / passed / failed / skipped; bugs by severity.
- Top 5 risks to fix before release, in priority order.
- What was **not** tested and why (no emulator, no credentials, out of scope), so I know the gaps.
- How to re-run the automated suite (`npx playwright test ...`).

## Working style

- Create a todo list for the phases and keep it updated.
- If a phase will take very long, finish the highest-risk areas first (payments, auth, data access), then broaden.
- Be precise. "Checkout sometimes fails" is not useful; exact steps, inputs and the failing file are.
- When finished, give me a short summary in chat: bug counts by severity and the top 3 issues.
