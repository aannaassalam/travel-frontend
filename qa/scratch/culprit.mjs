import { chromium } from "@playwright/test";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true });
const p = await ctx.newPage(); await p.goto("http://localhost:3000/contact", { waitUntil: "networkidle" }).catch(()=>{}); await p.waitForTimeout(600);
const res = await p.evaluate(() => {
  const W = document.documentElement.clientWidth; const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest(".leaflet-container")) continue; // clipped by overflow:hidden, not layout
    const rc = el.getBoundingClientRect(); if (rc.right <= W + 1 || rc.width === 0) continue;
    const s = getComputedStyle(el); if (s.position === "fixed") continue;
    out.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === "string" ? el.className : "").slice(0, 80), left: Math.round(rc.left), right: Math.round(rc.right), w: Math.round(rc.width), scrollW: el.scrollWidth, display: s.display, minW: s.minWidth, text: (el.textContent || "").trim().slice(0, 50), href: el.getAttribute("href") || "" });
  }
  // widest intrinsic content first: elements whose scrollWidth exceeds their box are the forcers
  return out.sort((a, b) => (b.scrollW - b.w) - (a.scrollW - a.w) || b.right - a.right).slice(0, 10);
});
console.log(JSON.stringify(res, null, 1)); await b.close();
