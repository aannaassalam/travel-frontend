import { chromium } from "@playwright/test";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true });
const p = await ctx.newPage(); await p.goto("http://localhost:3000/contact", { waitUntil: "networkidle" }).catch(()=>{}); await p.waitForTimeout(600);
const res = await p.evaluate(() => {
  const card = document.querySelector("div.surface.p-6"); if (!card) return "no card";
  card.style.width = "280px"; card.style.minWidth = "0"; card.style.overflow = "visible"; // force the card narrow; whatever still pokes out is the forcer
  const limit = 280 - 48 + 1, out = [];
  for (const el of card.querySelectorAll("*")) { const s = getComputedStyle(el); if (s.position === "absolute" || s.display === "none") continue; const rc = el.getBoundingClientRect(); if (rc.width > limit) out.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === "string" ? el.className : "").slice(0, 90), w: Math.round(rc.width), ws: s.whiteSpace, minW: s.minWidth, type: el.getAttribute("type") || el.getAttribute("rows") || "", text: (el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 40) }); }
  return out.slice(0, 12);
});
console.log(JSON.stringify(res, null, 1)); await b.close();
