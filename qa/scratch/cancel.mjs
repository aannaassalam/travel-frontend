const A = "http://localhost:3001/api/v1", AD = "http://localhost:3001/admin/v1";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tok = (await (await fetch(`${AD}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@yopmail.com", password: "12345678" }) })).json()).token;
const h = { Authorization: `Bearer ${tok}`, "content-type": "application/json" };
const l = (await (await fetch(`${AD}/listings`, { method: "POST", headers: h, body: JSON.stringify({ vertical: "CAR", title: { fr: "qa_test_cxl", en: "qa_test_cxl" }, description: { fr: "qa_test", en: "qa_test" }, images: ["https://example.com/qa.jpg"], city: "Lubumbashi", quantityTotal: 50, sellPrice: { USD: 10 }, costPrice: { USD: 5 }, attributes: { vehicleClass: "SUV", transmission: "AUTOMATIC", withDriver: true, make: "qa", model: "qa" } }) })).json()).listing;
console.log("publish:", (await fetch(`${AD}/listings/${l.id}/publish`, { method: "POST", headers: h })).status);
const o = await fetch(`${A}/orders`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": "qa_test_cxl_" + Date.now() }, body: JSON.stringify({ items: [{ vertical: "CAR", listingId: l.id, quantity: 1 }], contact: { firstName: "qa_test", lastName: "c", phone: "+15550100001" }, travellers: [{ firstName: "qa_test", lastName: "t" }], paymentMethod: "CASH", currency: "USD", locale: "fr" }) });
const ob = await o.json(); const ref = ob.order?.reference; console.log("order:", o.status, ref ?? ob.message);
let id, t = 0; while (!id && t++ < 12) { await sleep(400); const r = await (await fetch(`${AD}/orders?queue=all&q=${ref}`, { headers: h })).json(); id = r.items?.[0]?.id; }
const st = async () => { const x = (await (await fetch(`${AD}/orders/${id}`, { headers: h })).json()).order; return `${x?.status}/${x?.paymentStatus}`; };
console.log("order id:", id, "| state:", await st());
const c = await fetch(`${AD}/orders/${id}/transition`, { method: "POST", headers: h, body: JSON.stringify({ to: "CANCELLED", reason: "qa_test cancel", cancellationReason: "OTHER" }) });
const cb = await c.json(); console.log("cancel transition:", c.status, "|", cb.message ?? "", "| state now:", await st());
const k = await fetch(`${AD}/orders/${id}/cash-received`, { method: "POST", headers: h, body: JSON.stringify({ reason: "qa_test cash on cancelled" }) });
const kb = await k.json(); console.log("cash-received on cancelled:", k.status, "| code:", kb.code, "| msg:", kb.message, "| state now:", await st());
if (!(await st()).startsWith("CANCELLED")) await fetch(`${AD}/orders/${id}/transition`, { method: "POST", headers: h, body: JSON.stringify({ to: "CANCELLED", reason: "qa_test cleanup", cancellationReason: "OTHER" }) }).catch(()=>{});
await fetch(`${AD}/listings/${l.id}/archive`, { method: "POST", headers: h }); console.log("cleaned");
