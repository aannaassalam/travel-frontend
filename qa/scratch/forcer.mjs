import { chromium } from "@playwright/test";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true });
const p = await ctx.newPage(); await p.goto("http://localhost:3000/contact", { waitUntil: "networkidle" }).catch(()=>{}); await p.waitForTimeout(600);
const res = await p.evaluate(() => {
  const W = document.documentElement.clientWidth; const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest(".leaflet-container")) continue;
    const s = getComputedStyle(el); if (s.position === "fixed" || s.position === "absolute") continue;
    const rc = el.getBoundingClientRect(); const pr = el.parentElement?.getBoundingClientRect();
    if (!pr || rc.width <= pr.width + 1) continue; // only children wider than their parent = intrinsic forcers
    out.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === "string" ? el.className : "").slice(0, 90), w: Math.round(rc.width), parentW: Math.round(pr.width), ws: s.whiteSpace, display: s.display, text: (el.textContent || "").trim().slice(0, 50), type: el.getAttribute("type") || "" });
  }
  return { W, scrollW: document.documentElement.scrollWidth, forcers: out.slice(0, 10) };
});
console.log(JSON.stringify(res, null, 1)); await b.close();
