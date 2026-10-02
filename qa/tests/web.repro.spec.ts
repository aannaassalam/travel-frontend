import { test, expect } from "@playwright/test";

// Targeted reproductions of specific frontend findings. Desktop project only.
test.describe("web reproductions", () => {
  test("login open redirect: ?next=external is followed after sign-in", async ({ page }) => {
    await page.goto("/login?next=https://example.com/pwned");
    // fill phone + password (test customer). Field selectors are resilient: by type/placeholder.
    const phone = page.locator('input[type="tel"], input[name*="phone" i]').first();
    const pass = page.locator('input[type="password"]').first();
    await phone.waitFor({ state: "visible", timeout: 10000 });
    await phone.fill("7044804030");
    await pass.fill("12345678");
    await page.getByRole("button", { name: /se connecter|sign in|connexion|log ?in/i }).first().click().catch(() => {});
    // wait for either an off-site navigation or a stay
    await page.waitForTimeout(4000);
    const url = page.url();
    test.info().annotations.push({ type: "result", description: `landed: ${url}` });
    await page.screenshot({ path: "evidence/repro/open-redirect.png" });
    expect.soft(url, "login redirected off-site to attacker URL").not.toContain("example.com");
  });

  test("hotel detail shows hardcoded reviews", async ({ page }) => {
    await page.goto("/hotels/hotel/residence-gombe-suites-kinshasa", { waitUntil: "networkidle" });
    const patrick = await page.getByText(/Patrick M\.|collect(ed|ées).*(customers|clients)/i).count();
    await page.screenshot({ path: "evidence/repro/hotel-reviews.png", fullPage: true });
    test.info().annotations.push({ type: "result", description: `hardcoded-review-markers: ${patrick}` });
    expect.soft(patrick, "hardcoded reviews present").toBe(0);
  });

  test("property is bookable through a flight-offer route (no vertical check)", async ({ page }) => {
    // a known PROPERTY slug rendered on the flights/offer template
    await page.goto("/flights/offer/terrain-de-2-019-m-ville-basse-matadi-5", { waitUntil: "networkidle" });
    const status = await page.evaluate(() => document.title + "|" + (document.body.innerText.slice(0, 0)));
    const hasBookingBox = await page.getByRole("button", { name: /réserver|book|continuer|proceed/i }).count();
    await page.screenshot({ path: "evidence/repro/property-on-flight-route.png" });
    test.info().annotations.push({ type: "result", description: `booking-controls-on-property-via-flight-route: ${hasBookingBox}` });
    expect.soft(hasBookingBox, "property shown with booking controls on flight route").toBe(0);
  });

  test("placeholder agent phone on property listing", async ({ page }) => {
    await page.goto("/property/listing/terrain-de-2-019-m-ville-basse-matadi-5", { waitUntil: "networkidle" });
    const body = await page.evaluate(() => document.body.innerText);
    const placeholder = /\+?243\s?81\s?000\s?00\s?00|Joseph Mukendi/i.test(body);
    await page.screenshot({ path: "evidence/repro/placeholder-agent.png", fullPage: true });
    test.info().annotations.push({ type: "result", description: `placeholder-contact-present: ${placeholder}` });
    expect.soft(placeholder, "placeholder phone / fictional agent present").toBe(false);
  });

  test("html lang reflects default fr regardless of content language", async ({ page }) => {
    await page.goto("/about");
    const lang = await page.getAttribute("html", "lang");
    test.info().annotations.push({ type: "result", description: `html lang=${lang}` });
    expect.soft(lang).toBeTruthy();
  });
});
