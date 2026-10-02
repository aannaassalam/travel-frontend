import { chromium } from "@playwright/test";
const routes = ["/contact", "/login", "/account", "/account/bookings", "/account/profile", "/account/saved", "/account/enquiries"];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
for (const r of routes) {
  const p = await ctx.newPage(); await p.goto("http://localhost:3000" + r, { waitUntil: "networkidle" }).catch(() => {}); await p.waitForTimeout(600);
  const res = await p.evaluate(() => {
    const W = document.documentElement.clientWidth, over = document.documentElement.scrollWidth > W + 1; const out = [];
    for (const el of document.querySelectorAll("body *")) { const rc = el.getBoundingClientRect(); if (rc.right > W + 1 && rc.width > 0) { const s = getComputedStyle(el); out.push({ tag: el.tagName.toLowerCase(), cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 90), right: Math.round(rc.right), w: Math.round(rc.width), minW: s.minWidth, ws: s.whiteSpace, text: (el.textContent || "").trim().slice(0, 40) }); } }
    // report only the outermost offenders (those whose parent is not itself an offender)
    return { W, over, offenders: out.slice(0, 6) };
  });
  console.log(`\n== ${r}  overflow=${res.over} (vw=${res.W})`); res.offenders.forEach(o => console.log("  ", JSON.stringify(o)));
  await p.close();
}
await b.close();
