import { test, expect } from "@playwright/test";
import fs from "fs";

/**
 * SAFE API probes against the live backend.
 * Scope rule: this backend points at the production DB, so these tests are limited to
 *  - read-only calls, and
 *  - input that a correct server rejects (creating nothing).
 * A few probes exercise the create-order path; any order that does get created is
 * qa_test-tagged and cancelled in afterAll. No test here mutates inventory counters,
 * customer accounts, settings, or publishes catalogue — those findings are documented
 * from code analysis instead (see BUGS.md), to avoid corrupting production data.
 */
const API = "http://localhost:3001/api/v1";
const ADMIN = "http://localhost:3001/admin/v1";
const CUSTOMER = { phone: "+917044804030", password: "12345678" };
const ADMIN_CREDS = { email: "admin@yopmail.com", password: "12345678" };
let CAR_LISTING = ""; // resolved at runtime in beforeAll: the old hard-coded id was a SOLD-OUT car, which masked the real validation behaviour
let CAR_VERTICAL = "CAR";
const PROPERTY_LISTING = "6a7cd2fbe9b884df121f7979";
const FAKE_PHONE = "+15550100001"; // reserved fictional range, not a real account
// A local NODE_ENV=development server intentionally returns stacks; only demand "no stack" against a prod-configured target.
const EXPECT_PROD = process.env.QA_EXPECT_PROD === "1";
const DRIVER_INTERNALS = /\$clusterTime|"signature"|keyId|operationTime/;

const log: Record<string, unknown>[] = [];
const note = (name: string, data: unknown) => log.push({ name, data });
const createdRefs: string[] = []; // qa_test orders to clean up

const json = (o: unknown) => ({ data: o, headers: { "content-type": "application/json" } });
const key = () => `qa_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

let customerToken = "";
let adminToken = "";
const cust = (extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${customerToken}`, ...extra });
const adm = (extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${adminToken}`, ...extra });

const carOrder = (overrides: Record<string, unknown> = {}, items?: unknown[]) => ({
  items: items ?? [{ vertical: CAR_VERTICAL, listingId: CAR_LISTING, quantity: 1, startDate: "2026-11-10", endDate: "2026-11-12" }],
  contact: { firstName: "qa_test", lastName: "order", phone: FAKE_PHONE },
  travellers: [{ firstName: "qa_test", lastName: "traveller" }],
  paymentMethod: "CASH", currency: "USD", locale: "fr",
  ...overrides,
});

test.beforeAll(async ({ request }) => {
  const c = await request.post(`${API}/auth/login`, json(CUSTOMER));
  expect(c.status(), "customer login").toBe(200);
  customerToken = (await c.json()).token;
  const a = await request.post(`${ADMIN}/auth/login`, json(ADMIN_CREDS));
  expect(a.status(), "admin login").toBe(200);
  adminToken = (await a.json()).token;
  // pick a bookable non-property listing (admin DTO exposes `available`)
  const list = await (await request.get(`${ADMIN}/listings?limit=100`, { headers: adm() })).json();
  const items: any[] = list.items ?? [];
  const pick = items.find((l) => l.status === "PUBLISHED" && l.vertical === "CAR" && (l.available ?? 0) > 0)
    ?? items.find((l) => l.status === "PUBLISHED" && l.vertical !== "PROPERTY" && (l.available ?? 0) > 0);
  expect(pick, "a bookable listing exists").toBeTruthy();
  CAR_LISTING = pick.id ?? pick._id;
  CAR_VERTICAL = pick.vertical;
  note("bookable-listing", { id: CAR_LISTING, vertical: pick.vertical, slug: pick.slug, available: pick.available });
});

test.afterAll(async ({ request }) => {
  // cancel any qa_test orders this run created (releases their inventory hold)
  for (const ref of createdRefs) {
    try {
      const list = await (await request.post(`${ADMIN}/auth/login`, json(ADMIN_CREDS))).json();
      const tok = list.token;
      // the admin search index lags creation; retry so cleanup never silently skips an order
      let id: string | undefined;
      for (let i = 0; i < 12 && !id; i++) {
        const found = await (await request.get(`${ADMIN}/orders?queue=all&q=${ref}`, { headers: { Authorization: `Bearer ${tok}` } })).json();
        id = found.items?.[0]?.id ?? found.items?.[0]?._id;
        if (!id) await new Promise((r) => setTimeout(r, 400));
      }
      if (id) await request.post(`${ADMIN}/orders/${id}/transition`, { ...json({ to: "CANCELLED", reason: "qa_test cleanup", cancellationReason: "OTHER" }), headers: { Authorization: `Bearer ${tok}`, "content-type": "application/json" } });
    } catch { /* best effort */ }
  }
  fs.mkdirSync("evidence", { recursive: true });
  fs.writeFileSync("evidence/api-core.json", JSON.stringify({ log, cleanedUp: createdRefs }, null, 2));
});

test.describe("auth & permission boundaries (read-only)", () => {
  test("protected customer endpoints without token -> 401", async ({ request }) => {
    for (const p of ["/auth/me", "/me/orders"]) {
      const r = await request.get(`${API}${p}`);
      expect.soft(r.status(), p).toBe(401);
    }
  });
  test("garbage / tampered JWT -> 401, no stack leak, correct code", async ({ request }) => {
    const r = await request.get(`${API}/auth/me`, { headers: { Authorization: "Bearer abc.def.ghi" } });
    const body = await r.json();
    note("garbage-jwt", { status: r.status(), body });
    expect.soft(r.status(), "invalid token maps to").toBe(401);
    expect.soft(JSON.stringify(body), "raw driver internals leaked").not.toMatch(DRIVER_INTERNALS);
    if (EXPECT_PROD) expect.soft(body.stack, "stack leaked").toBeUndefined();
    const t = customerToken.split(".");
    const r2 = await request.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t[0]}.${t[1]}.${t[2].slice(0, -3)}AAA` } });
    note("tampered-jwt", { status: r2.status(), body: await r2.json() });
    expect.soft(r2.status()).toBe(401);
  });
  test("admin endpoints reject a customer token", async ({ request }) => {
    for (const p of ["/orders", "/customers", "/settings", "/dashboard"]) {
      const r = await request.get(`${ADMIN}${p}`, { headers: cust() });
      expect.soft(r.status(), p).toBe(401);
    }
  });
  test("customer endpoint rejects an admin token (audience)", async ({ request }) => {
    const r = await request.get(`${API}/auth/me`, { headers: adm() });
    expect.soft(r.status()).toBe(401);
  });
});

test.describe("API robustness (creates nothing)", () => {
  test("malformed JSON / empty body / wrong types -> 400", async ({ request }) => {
    const bad = await request.post(`${API}/orders`, { headers: { "content-type": "application/json", "Idempotency-Key": key() }, data: "{not json" });
    note("malformed-json", { status: bad.status(), body: (await bad.text()).slice(0, 200) });
    expect.soft(bad.status()).toBe(400);
    const empty = await request.post(`${API}/orders`, { headers: { "Idempotency-Key": key() } });
    note("empty-body", { status: empty.status() });
    expect.soft(empty.status()).toBe(400);
    const types = await request.post(`${API}/orders`, { ...json({ items: "x", contact: 5 }), headers: { "content-type": "application/json", "Idempotency-Key": key() } });
    note("wrong-types", { status: types.status(), body: (await types.text()).slice(0, 200) });
    expect.soft(types.status()).toBe(400);
  });
  test("no Idempotency-Key -> 400; bad vertical -> 400", async ({ request }) => {
    const r = await request.post(`${API}/orders`, json(carOrder()));
    expect.soft(r.status()).toBe(400);
    const v = await request.get(`${API}/listings?vertical=NOPE`);
    expect.soft(v.status()).toBe(400);
  });
  test("error bodies carry no stack traces", async ({ request }) => {
    const r2 = await request.get(`${ADMIN}/orders/not-an-objectid`, { headers: adm() });
    const b2 = await r2.text();
    note("cast-error", { status: r2.status(), body: b2.slice(0, 400) });
    expect.soft(b2, "raw driver internals leaked").not.toMatch(DRIVER_INTERNALS);
    if (EXPECT_PROD) {
      expect.soft(b2).not.toMatch(/\.(ts|js):\d+/);
      expect.soft(b2).not.toContain('"stack"');
    }
  });
  test("search param abuse: 10k city, catastrophic regex, huge limit", async ({ request }) => {
    const t = Date.now();
    const r = await request.get(`${API}/listings?vertical=CAR&city=${"a".repeat(10000)}`);
    note("huge-city", { status: r.status(), ms: Date.now() - t });
    expect.soft(r.status()).toBeLessThan(500);
    const rx = await request.get(`${API}/listings?vertical=CAR&q=${encodeURIComponent("(a+)+$[")}`);
    expect.soft(rx.status()).toBeLessThan(500);
    const lim = await request.get(`${API}/listings?vertical=CAR&limit=99999`);
    const lb = await lim.json();
    note("huge-limit", { status: lim.status(), limit: lb.limit, count: lb.items?.length });
    expect.soft(lb.items?.length ?? 0).toBeLessThanOrEqual(60);
  });
  test("admin search ?q= with regex metacharacters (ReDoS surface)", async ({ request }) => {
    const r = await request.get(`${ADMIN}/customers?q=${encodeURIComponent("[")}`, { headers: adm() });
    note("admin-customers-regex", { status: r.status(), body: (await r.text()).slice(0, 200) });
    expect.soft(r.status(), "unescaped $regex -> 500").toBeLessThan(500);
    const l = await request.get(`${ADMIN}/locations?q=${encodeURIComponent("(")}`, { headers: adm() });
    note("admin-locations-regex", { status: l.status(), body: (await l.text()).slice(0, 200) });
    expect.soft(l.status()).toBeLessThan(500);
  });
});

test.describe("input validation (rejections create nothing; accepted ones are cleaned up)", () => {
  async function tryOrder(request: any, headers: Record<string, string>, body: unknown, name: string) {
    const r = await request.post(`${API}/orders`, { ...json(body), headers: { ...headers, "content-type": "application/json", "Idempotency-Key": key() } });
    let parsed: any = null;
    try { parsed = await r.json(); } catch { parsed = (await r.text()).slice(0, 200); }
    if (r.status() === 201 && parsed?.order?.reference) createdRefs.push(parsed.order.reference);
    note(name, { status: r.status(), accepted: r.status() === 201, summary: parsed?.order ? { ref: parsed.order.reference, items: parsed.order.items?.map((i: any) => ({ v: i.vertical, qty: i.quantity, start: i.startDate, end: i.endDate })), total: parsed.order.total } : parsed });
    return r;
  }
  test("quantity edge cases are rejected", async ({ request }) => {
    for (const q of [0, -1, 1.5, "abc", 21, null]) {
      const r = await tryOrder(request, {}, carOrder({}, [{ vertical: CAR_VERTICAL, listingId: CAR_LISTING, quantity: q }]), `qty-${q}`);
      expect.soft(r.status(), `quantity=${q}`).toBe(400);
    }
  });
  test("reversed / past / invalid dates are rejected", async ({ request }) => {
    const rev = await tryOrder(request, {}, carOrder({}, [{ vertical: CAR_VERTICAL, listingId: CAR_LISTING, quantity: 1, startDate: "2026-11-12", endDate: "2026-11-10" }]), "car-reversed-dates");
    expect.soft(rev.status(), "endDate < startDate").toBe(400);
    const past = await tryOrder(request, {}, carOrder({}, [{ vertical: CAR_VERTICAL, listingId: CAR_LISTING, quantity: 1, startDate: "2020-01-01", endDate: "2020-01-03" }]), "car-past-dates");
    expect.soft(past.status(), "past dates").toBe(400);
    const garbage = await tryOrder(request, {}, carOrder({}, [{ vertical: CAR_VERTICAL, listingId: CAR_LISTING, quantity: 1, startDate: "not-a-date", endDate: "2026-13-45" }]), "car-garbage-dates");
    expect.soft(garbage.status(), "invalid dates").toBe(400);
  });
  test("property vertical is enquiry-only (rejected)", async ({ request }) => {
    const r = await tryOrder(request, {}, carOrder({}, [{ vertical: "PROPERTY", listingId: PROPERTY_LISTING, quantity: 1 }]), "property-order");
    expect.soft(r.status()).toBeGreaterThanOrEqual(400);
  });
  test("contact email / oversized name / prototype-polluted traveller rejected", async ({ request }) => {
    const r = await tryOrder(request, {}, carOrder({ contact: { firstName: "qa_test", lastName: "x".repeat(5000), phone: FAKE_PHONE, email: "nope" }, travellers: [{ firstName: { $gt: "" }, lastName: ["a"], dateOfBirth: "2030-01-01" }] }), "contact-traveller-abuse");
    expect.soft(r.status(), "invalid email / 5000-char name / future DOB / non-string names").toBe(400);
  });
  test("enquiry: unvalidated email and 10k name", async ({ request }) => {
    const r = await request.post(`${API}/enquiries`, json({ customerName: "qa_test_" + "x".repeat(10000), phone: FAKE_PHONE, email: "not-an-email", message: "qa_test enquiry", kind: "GENERAL" }));
    note("enquiry-abuse", { status: r.status(), body: await r.json() });
    expect.soft(r.status(), "10k name / bad email").toBe(400);
  });
});

test.describe("documented-design probes (read-only observation)", () => {
  test("order readable by reference with no auth", async ({ request }) => {
    const a = await request.post(`${API}/orders`, { ...json(carOrder()), headers: { "content-type": "application/json", "Idempotency-Key": key() } });
    if (a.status() !== 201) { note("ref-order-create", { status: a.status() }); return; }
    const ref = (await a.json()).order.reference;
    createdRefs.push(ref);
    const r = await request.get(`${API}/orders/${ref}`); // no Authorization header
    const b = await r.json();
    note("order-by-reference-noauth", { status: r.status(), fields: Object.keys(b.order ?? {}), travellers: b.order?.travellers, phone: b.order?.contactPhoneMasked });
    expect.soft(r.status(), "reference alone authorises read").toBe(200);
  });
  test("idempotency key is not scoped to the caller", async ({ request }) => {
    const k = key();
    const a = await request.post(`${API}/orders`, { ...json(carOrder()), headers: { "content-type": "application/json", "Idempotency-Key": k } });
    if (a.status() !== 201) { note("idem-first", { status: a.status() }); return; }
    const first = (await a.json()).order; createdRefs.push(first.reference);
    // a different caller (signed-in customer, different contact) replays the same key
    const b = await request.post(`${API}/orders`, { ...json(carOrder({ contact: { firstName: "qa_test", lastName: "second", phone: CUSTOMER.phone } })), headers: cust({ "content-type": "application/json", "Idempotency-Key": k }) });
    const bb = await b.json();
    note("idempotency-not-scoped", { firstRef: first.reference, replay: { status: b.status(), ref: bb.order?.reference, sameOrderReturned: bb.order?.reference === first.reference } });
    expect.soft(bb.order?.reference === first.reference, "replay returned the other caller's order").toBe(false);
  });
});
