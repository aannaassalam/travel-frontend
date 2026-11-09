/**
 * Duty Free totals, the visa rule for international buses and flights, and
 * both modules' texts in seven languages. No browser, no API:
 *
 *   JITI_TSCONFIG_PATHS=1 npx jiti scripts/checkDutyFree.ts
 *
 * (The flag lets jiti read the `@/` imports of lib/money.ts and lib/i18n.ts.)
 */
import assert from "node:assert/strict";
import { dutyFreeTotals } from "../lib/dutyFree";
import { translate } from "../lib/i18n";
import dutyFreeMessages from "../lib/messages/dutyFree";
import tripMessages from "../lib/messages/trip";
import { isInternational } from "../lib/routes";

// --- totals: subtotal + the point's fee + each shop's fee ONCE ----------------
const feeA = { CDF: 1000, USD: 50 };
const feeB = { CDF: 2000, USD: 100 };
const lines = [
  { unitPrice: { CDF: 10000, USD: 500 }, quantity: 2, shopId: "A", fee: feeA },
  { unitPrice: { CDF: 5000, USD: 250 }, quantity: 1, shopId: "A", fee: feeA },
  { unitPrice: { CDF: 3000, USD: 150 }, quantity: 3, shopId: "B", fee: feeB }
];
const airport = { CDF: 5000, USD: 250 };

const t1 = dutyFreeTotals(lines, airport);
assert.deepEqual(t1.subtotal, { CDF: 34000, USD: 1700 });
assert.deepEqual(t1.fees, { CDF: 3000, USD: 150 }, "each shop's fee once");
assert.deepEqual(t1.total, { CDF: 42000, USD: 2100 }, "subtotal + point + fees");

// More of the same products: the fees do not move.
const more = lines.map((l) => ({ ...l, quantity: l.quantity * 5 }));
assert.deepEqual(dutyFreeTotals(more, airport).fees, { CDF: 3000, USD: 150 });

// A free point (no fee sent) and a shop with no fee: 20 000 + 9 000 + B's 2 000.
const t2 = dutyFreeTotals([{ ...lines[0], fee: undefined }, lines[2]], undefined);
assert.deepEqual(t2.total, { CDF: 31000, USD: 1550 });
// No fee anywhere: the subtotal as it is.
const bare = { unitPrice: { CDF: 700 }, quantity: 2, shopId: "A" };
assert.deepEqual(dutyFreeTotals([bare]).total, { CDF: 1400 });
// A fee without a dollar price: dollars cannot be charged, francs can.
assert.deepEqual(dutyFreeTotals(lines, { CDF: 5000 }).total, { CDF: 42000 });
// A line with no dollar price: the subtotal is in francs only.
assert.deepEqual(dutyFreeTotals([...lines, bare]).subtotal, { CDF: 35400 });
assert.deepEqual(dutyFreeTotals([]).total, { CDF: 0 });

// --- the visa rule -------------------------------------------------------------
assert.equal(isInternational({ vertical: "FLIGHT", tripScope: "INTERNATIONAL" }), true);
assert.equal(isInternational({ vertical: "BUS", tripScope: "INTERNATIONAL" }), true);
assert.equal(isInternational({ vertical: "FLIGHT", tripScope: "NATIONAL" }), false);
assert.equal(isInternational({ vertical: "BUS" }), false, "no value = national");
assert.equal(isInternational({ vertical: "HOTEL", tripScope: "INTERNATIONAL" }), false);
// The payment step's button: blocked until the visa box is ticked, international only.
const blocked = (sel: Parameters<typeof isInternational>[0], visa: boolean) => isInternational(sel) && !visa;
assert.equal(blocked({ vertical: "FLIGHT", tripScope: "INTERNATIONAL" }, false), true);
assert.equal(blocked({ vertical: "FLIGHT", tripScope: "INTERNATIONAL" }, true), false);
assert.equal(blocked({ vertical: "BUS", tripScope: "NATIONAL" }, false), false);

// --- every key in all seven languages, and wired in -------------------------
for (const m of [dutyFreeMessages, tripMessages] as Record<string, Record<string, string>>[]) {
  const keys = Object.keys(m.fr).sort();
  assert.equal(Object.keys(m).length, 7, "seven languages");
  for (const [l, d] of Object.entries(m)) {
    assert.deepEqual(Object.keys(d).sort(), keys, `${l}: same keys as fr`);
    for (const [k, v] of Object.entries(d)) assert.ok(v.trim(), `${l} ${k} empty`);
  }
}
assert.equal(translate("ar", "nav.dutyFree"), dutyFreeMessages.ar["nav.dutyFree"]);
assert.equal(translate("fr", "trip.international"), "International");
assert.equal(translate("ru", "trip.visaApply"), tripMessages.ru["trip.visaApply"]);

console.log("checkDutyFree: all good");
