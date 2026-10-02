const AD = "http://localhost:3001/admin/v1";
const tok = (await (await fetch(`${AD}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@yopmail.com", password: "12345678" }) })).json()).token;
const h = { Authorization: `Bearer ${tok}`, "content-type": "application/json" };
const l = (await (await fetch(`${AD}/listings`, { method: "POST", headers: h, body: JSON.stringify({ vertical: "CAR", title: { fr: "qa_test_pub", en: "qa_test_pub" }, city: "Lubumbashi", quantityTotal: 50, sellPrice: { USD: 10 }, costPrice: { USD: 5 }, attributes: { vehicleClass: "SUV", transmission: "AUTOMATIC", withDriver: true } }) })).json()).listing;
const p = await fetch(`${AD}/listings/${l.id}/publish`, { method: "POST", headers: h });
const pb = await p.json();
console.log("publish:", p.status, "| message:", pb.message, "| blockers:", JSON.stringify(pb.blockers ?? pb.details ?? pb.code ?? ""));
await fetch(`${AD}/listings/${l.id}/archive`, { method: "POST", headers: h });
// what does a real PUBLISHED car listing carry that mine lacks?
const pubd = (await (await fetch(`${AD}/listings?limit=100`, { headers: h })).json()).items.find(i => i.vertical === "CAR" && i.status === "PUBLISHED");
if (pubd) { const full = (await (await fetch(`${AD}/listings/${pubd.id}`, { headers: h })).json()).listing; console.log("published CAR sample keys:", Object.keys(full).filter(k => full[k] != null && full[k] !== "" && !(Array.isArray(full[k]) && !full[k].length)).join(", ")); console.log("sample validFrom/supplier/images/description:", JSON.stringify({ validFrom: full.validFrom, supplier: full.supplier, images: (full.images||[]).length, desc: !!full.description?.fr }).slice(0, 200)); }
