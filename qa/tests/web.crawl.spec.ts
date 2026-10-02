import { test, expect, Page } from "@playwright/test";
import fs from "fs";

// Smoke-crawl every static route: HTTP status, console errors, failed requests, horizontal overflow.
const ROUTES = [
  "/", "/about", "/contact", "/help", "/privacy", "/terms", "/login",
  "/hotels", "/flights", "/bus", "/cars", "/activities", "/property", "/restaurants",
  "/property/buy/apartment", "/property/rent/villa", "/property/bogus/bogus",
  "/hotels/hotel/does-not-exist", "/property/listing/does-not-exist", "/restaurants/does-not-exist",
  "/flights/offer/does-not-exist", "/bus/route/does-not-exist", "/cars/vehicle/does-not-exist", "/activities/activity/does-not-exist",
  "/account", "/account/bookings", "/account/profile", "/account/saved", "/account/enquiries", "/account/bookings/FAKE-REF",
  "/booking/contact", "/booking/travellers", "/booking/payment", "/booking/payment/return", "/booking/confirmation/FAKE-REF",
  "/restaurants/checkout", "/this-page-does-not-exist",
];

const results: Record<string, unknown>[] = [];

async function audit(page: Page, route: string) {
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  const resp = await page.goto(route, { waitUntil: "networkidle" }).catch((e) => ({ status: () => `ERR ${e.message}` }) as any);
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const imgsNoAlt = await page.locator("img:not([alt])").count();
  const finalUrl = page.url();
  const rec = { route, status: resp?.status(), finalUrl, overflow, imgsNoAlt, consoleErrors: [...new Set(consoleErrors)], failed: [...new Set(failed)] };
  results.push(rec);
  return rec;
}

for (const route of ROUTES) {
  test(`crawl ${route}`, async ({ page }, testInfo) => {
    const rec = await audit(page, route);
    await page.screenshot({ path: `evidence/crawl/${testInfo.project.name}${route.replace(/[^a-z0-9]+/gi, "_") || "_root"}.png`, fullPage: false });
    test.info().annotations.push({ type: "result", description: JSON.stringify(rec) });
    expect.soft(rec.overflow, "horizontal overflow").toBe(false);
    expect.soft(rec.consoleErrors, "console errors").toEqual([]);
    expect.soft(rec.failed.filter((f) => !/does-not-exist|FAKE|auth\/me|localhost:3000/.test(f)), "failed requests").toEqual([]);
  });
}

test.afterAll(async ({}, testInfo) => {
  fs.mkdirSync("evidence", { recursive: true });
  fs.writeFileSync(`evidence/crawl-${testInfo.project.name}.json`, JSON.stringify(results, null, 2));
});
