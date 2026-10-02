import { test, expect, APIRequestContext } from "@playwright/test";
import fs from "fs";

/**
 * DESTRUCTIVE repros — user confirmed the Atlas DB is dev/throwaway (2026-10-02).
 * Isolation: all writes target a qa_test_ listing created in the first test (not shared seed data).
 * Cleanup in afterAll: cancel qa_test orders, archive the qa_test listing, restore the test
 * customer account and any changed settings. No real SMS/payment is triggered.
 */
const API = "http://localhost:3001/api/v1";
const ADMIN = "http://localhost:3001/admin/v1";
const CUSTOMER = { phone: "+917044804030", password: "12345678" };
const ADMIN_CREDS = { email: "admin@yopmail.com", password: "12345678" };
const FAKE_PHONE = "+15550100001";

// Write-through: Playwright restarts the worker after a failed test, so buffering notes until
// afterAll silently loses every note from the worker that saw the failure (and re-runs beforeAll).
const EVIDENCE = "evidence/api-destructive.jsonl";
const note = (name: string, data: unknown) => { fs.mkdirSync("evidence", { recursive: true }); fs.appendFileSync(EVIDENCE, JSON.stringify({ name, data }) + "\n"); };
const json = (o: unknown) => ({ data: o, headers: { "content-type": "application/json" } });
const key = () => `qa_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

let customerToken = "";
let adminToken = "";
let qaListingId = "";
const createdRefs: string[] = [];
const archiveListingIds: string[] = [];
const cust = (e: Record<string, string> = {}) => ({ Authorization: `Bearer ${customerToken}`, ...e });
const adm = (e: Record<string, string> = {}) => ({ Authorization: `Bearer ${adminToken}`, ...e });

async function stepUp(request: APIRequestContext) {
  const r = await request.post(`${ADMIN}/auth/step-up`, { ...json({ password: ADMIN_CREDS.password }), headers: adm({ "content-type": "application/json" }) });
  expect(r.status(), "step-up").toBe(200);
}
async function listing(request: APIRequestContext, id: string) {
  const b = await (await request.get(`${ADMIN}/listings/${id}`, { headers: adm() })).json();
  const l = b.listing ?? b;
  return { held: l.quantityHeld, sold: l.quantitySold, total: l.quantityTotal, status: l.status, vertical: l.vertical };
}
async function orderIdByRef(request: APIRequestContext, ref: string) {
  // the admin search index lags creation by a few hundred ms; without a retry the id is undefined
  for (let i = 0; i < 12; i++) {
    const b = await (await request.get(`${ADMIN}/orders?queue=all&q=${ref}`, { headers: adm() })).json();
    const id = b.items?.[0]?.id ?? b.items?.[0]?._id;
    if (id) return id;
    await new Promise((r) => setTimeout(r, 400));
  }
  return undefined;
}
async function makeCashOrder(request: APIRequestContext, headers: Record<string, string> = {}, contact?: unknown) {
  return request.post(`${API}/orders`, {
    ...json({
      items: [{ vertical: "CAR", listingId: qaListingId, quantity: 1 }],
      contact: contact ?? { firstName: "qa_test", lastName: "order", phone: FAKE_PHONE },
      travellers: [{ firstName: "qa_test", lastName: "t" }],
      paymentMethod: "CASH", currency: "USD", locale: "fr",
    }),
    headers: { ...headers, "content-type": "application/json", "Idempotency-Key": key() },
  });
}

// Not serial: a bug-finding (failing) test must not skip the others. workers=1 keeps order + shared state.

test.beforeAll(async ({ request }) => {
  customerToken = (await (await request.post(`${API}/auth/login`, json(CUSTOMER))).json()).token;
  adminToken = (await (await request.post(`${ADMIN}/auth/login`, json(ADMIN_CREDS))).json()).token;
  expect(customerToken && adminToken, "logins").toBeTruthy();
  // Setup: a bookable qa_test CAR listing so the order-based tests have stock. (This itself
  // relies on mass-assignment to set status PUBLISHED + counters from the request body.)
  const r = await request.post(`${ADMIN}/listings`, {
    // publish-blockers require a French description, >=1 image, and make+model
    ...json({ vertical: "CAR", title: { fr: "qa_test_bookable", en: "qa_test_bookable" }, description: { fr: "qa_test", en: "qa_test" }, images: ["https://example.com/qa_test.jpg"], city: "Lubumbashi", quantityTotal: 50, sellPrice: { USD: 10 }, costPrice: { USD: 5 }, attributes: { vehicleClass: "SUV", transmission: "AUTOMATIC", withDriver: true, make: "qa_test", model: "qa_test" } }),
    headers: adm({ "content-type": "application/json" }),
  });
  const l = (await r.json()).listing ?? {};
  qaListingId = l.id ?? l._id ?? "";
  if (qaListingId) archiveListingIds.push(qaListingId);
  expect(r.status(), "setup listing create").toBe(201);
  // status is no longer settable from the body (BUG-010 fixed), so publish through the real endpoint
  const pub = await request.post(`${ADMIN}/listings/${qaListingId}/publish`, { headers: adm() });
  const state = await listing(request, qaListingId);
  note("setup-bookable-listing", { create: r.status(), publish: pub.status(), id: qaListingId, state: state.status, total: state.total });
  expect(state.status, "setup listing must be PUBLISHED via /publish").toBe("PUBLISHED");
});

test.afterAll(async ({ request }) => {
  const tok = (await (await request.post(`${ADMIN}/auth/login`, json(ADMIN_CREDS))).json()).token;
  const h = { Authorization: `Bearer ${tok}` };
  for (const ref of createdRefs) {
    try {
      const b = await (await request.get(`${ADMIN}/orders?q=${ref}`, { headers: h })).json();
      const id = b.items?.[0]?.id ?? b.items?.[0]?._id;
      const cur = b.items?.[0]?.status;
      if (id && cur !== "CANCELLED" && cur !== "COMPLETED") await request.post(`${ADMIN}/orders/${id}/transition`, { ...json({ to: "CANCELLED", reason: "qa_test cleanup", cancellationReason: "OTHER" }), headers: { ...h, "content-type": "application/json" } });
    } catch { /* best effort */ }
  }
  for (const id of archiveListingIds) { try { await request.post(`${ADMIN}/listings/${id}/archive`, { headers: h }); } catch { /* */ } }
  note("afterAll", { qaListingId, createdRefs, archived: archiveListingIds });
});

test("BUG-010: mass-assignment forges status PUBLISHED + quantitySold on create, and rewrites vertical on update", async ({ request }) => {
  // create a draft-looking listing but force PUBLISHED + a bogus quantitySold via the request body
  const r = await request.post(`${ADMIN}/listings`, {
    ...json({ vertical: "CAR", title: { fr: "qa_test_massassign", en: "qa_test_massassign" }, city: "Lubumbashi", status: "PUBLISHED", quantityTotal: 50, quantitySold: 777, quantityHeld: 0, sellPrice: { USD: 10 }, costPrice: { USD: 5 }, attributes: { vehicleClass: "SUV", transmission: "AUTOMATIC", withDriver: true } }),
    headers: adm({ "content-type": "application/json" }),
  });
  const id = ((await r.json()).listing ?? {}).id;
  if (id) archiveListingIds.push(id);
  const created: Partial<Awaited<ReturnType<typeof listing>>> = id ? await listing(request, id) : {};
  note("mass-assign-create", { status: r.status(), stored: created });
  expect.soft(r.status(), "forged create accepted").toBe(201);
  expect.soft(created.status, "status must not be settable from body").not.toBe("PUBLISHED");
  expect.soft(created.sold, "quantitySold forged from body").not.toBe(777); // bug if it IS 777
  // update: flip vertical via body
  if (id) {
    await request.patch(`${ADMIN}/listings/${id}`, { ...json({ vertical: "HOTEL" }), headers: adm({ "content-type": "application/json" }) });
    const after = await listing(request, id);
    note("mass-assign-update-vertical", { vertical: after.vertical });
    expect.soft(after.vertical, "vertical should not be rewritable via body").toBe("CAR");
  }
});

test("BUG-001: cash-received twice double-sells stock", async ({ request }) => {
  test.skip(!qaListingId, "no qa listing");
  const a = await makeCashOrder(request);
  expect(a.status(), "order create on qa listing").toBe(201);
  const ref = (await a.json()).order.reference; createdRefs.push(ref);
  const id = await orderIdByRef(request, ref);
  expect(id, "admin search found the order").toBeTruthy();
  const l1 = await listing(request, qaListingId);
  const c1 = await request.post(`${ADMIN}/orders/${id}/cash-received`, { ...json({ reason: "qa_test cash 1" }), headers: adm({ "content-type": "application/json" }) });
  const l2 = await listing(request, qaListingId);
  const c2 = await request.post(`${ADMIN}/orders/${id}/cash-received`, { ...json({ reason: "qa_test cash 2" }), headers: adm({ "content-type": "application/json" }) });
  const l3 = await listing(request, qaListingId);
  note("cash-twice", { ref, c1: c1.status(), c2: c2.status(), sold: [l1.sold, l2.sold, l3.sold], held: [l1.held, l2.held, l3.held] });
  expect.soft(c2.status(), "second cash-received should be rejected").toBeGreaterThanOrEqual(400);
  expect.soft(l3.sold - l2.sold, "sold incremented again on 2nd cash-received").toBe(0);
});

test("BUG-001b: cash-received on a CANCELLED order revives it", async ({ request }) => {
  test.skip(!qaListingId, "no qa listing");
  const a = await makeCashOrder(request);
  expect(a.status()).toBe(201);
  const ref = (await a.json()).order.reference; createdRefs.push(ref);
  const id = await orderIdByRef(request, ref);
  expect(id, "admin search found the order").toBeTruthy();
  await request.post(`${ADMIN}/orders/${id}/transition`, { ...json({ to: "CANCELLED", reason: "qa_test cancel", cancellationReason: "OTHER" }), headers: adm({ "content-type": "application/json" }) });
  const c = await request.post(`${ADMIN}/orders/${id}/cash-received`, { ...json({ reason: "qa_test cash on cancelled" }), headers: adm({ "content-type": "application/json" }) });
  const after = (await (await request.get(`${ADMIN}/orders/${id}`, { headers: adm() })).json()).order;
  note("cash-on-cancelled", { ref, cashStatus: c.status(), status: after?.status, paymentStatus: after?.paymentStatus });
  expect.soft(c.status(), "cash-received on CANCELLED should be rejected").toBeGreaterThanOrEqual(400);
  expect.soft(after?.status, "cancelled order should stay cancelled").toBe("CANCELLED");
});

test("BUG-002: guest checkout overwrites the account holder's name and attaches the order", async ({ request }) => {
  test.skip(!qaListingId, "no qa listing");
  const before = (await (await request.get(`${API}/auth/me`, { headers: cust() })).json()).customer;
  const a = await makeCashOrder(request, {}, { firstName: "qa_test_OVERWRITE", lastName: "qa_test", phone: CUSTOMER.phone, email: "qa_test_overwrite@example.com" });
  const ab = await a.json();
  const ref = ab.order?.reference; if (ref) createdRefs.push(ref);
  const after = (await (await request.get(`${API}/auth/me`, { headers: cust() })).json()).customer;
  const orders = (await (await request.get(`${API}/me/orders`, { headers: cust() })).json()).items;
  const attached = Boolean(ref) && orders.some((o: any) => o.reference === ref);
  note("guest-overwrite", { status: a.status(), code: ab.code, before: { firstName: before.firstName, email: before.email }, after: { firstName: after.firstName, email: after.email }, attached });
  await request.patch(`${API}/auth/me`, { ...json({ firstName: before.firstName, lastName: before.lastName, email: before.email ?? "" }), headers: cust({ "content-type": "application/json" }) });
  // fixed behaviour: a registered phone cannot be used by a guest — they are told to sign in
  expect.soft(a.status(), "guest checkout with a registered phone must require sign-in").toBe(409);
  expect.soft(after.firstName, "account first name overwritten by guest checkout").toBe(before.firstName);
  expect.soft(attached, "guest order attached to the account").toBe(false);
});

test("BUG-009: idempotency key is not scoped to the caller", async ({ request }) => {
  test.skip(!qaListingId, "no qa listing");
  const k = key();
  const a = await request.post(`${API}/orders`, { ...json({ items: [{ vertical: "CAR", listingId: qaListingId, quantity: 1 }], contact: { firstName: "qa_test", lastName: "first", phone: FAKE_PHONE }, travellers: [{ firstName: "qa_test", lastName: "t" }], paymentMethod: "CASH", currency: "USD", locale: "fr" }), headers: { "content-type": "application/json", "Idempotency-Key": k } });
  expect(a.status()).toBe(201);
  const first = (await a.json()).order; createdRefs.push(first.reference);
  const b = await request.post(`${API}/orders`, { ...json({ items: [{ vertical: "CAR", listingId: qaListingId, quantity: 1 }], contact: { firstName: "qa_test", lastName: "second", phone: CUSTOMER.phone }, travellers: [{ firstName: "qa_test", lastName: "u" }], paymentMethod: "CASH", currency: "USD", locale: "fr" }), headers: cust({ "content-type": "application/json", "Idempotency-Key": k }) });
  const bb = await b.json();
  note("idempotency-cross-caller", { firstRef: first.reference, replayStatus: b.status(), replayRef: bb.order?.reference, sameOrder: bb.order?.reference === first.reference });
  expect.soft(bb.order?.reference === first.reference, "a different caller replaying the key got the first caller's order").toBe(false);
});

test("BUG-013: settings accept a negative value", async ({ request }) => {
  const cur = (await (await request.get(`${ADMIN}/settings`, { headers: adm() })).json());
  const s = cur.settings ?? cur;
  const orig = s.holdTtlCashHours;
  await stepUp(request);
  const r = await request.patch(`${ADMIN}/settings`, { ...json({ holdTtlCashHours: -5 }), headers: adm({ "content-type": "application/json" }) });
  const got = ((await r.json()).settings ?? {}).holdTtlCashHours;
  note("settings-negative", { status: r.status(), orig, saved: got });
  if (r.status() === 200) { await stepUp(request); await request.patch(`${ADMIN}/settings`, { ...json({ holdTtlCashHours: orig }), headers: adm({ "content-type": "application/json" }) }); }
  expect.soft(r.status(), "negative holdTtlCashHours should be rejected").toBeGreaterThanOrEqual(400);
});
