import { chromium } from "@playwright/test";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true });
const p = await ctx.newPage(); await p.goto("http://localhost:3000/contact", { waitUntil: "networkidle" }).catch(()=>{}); await p.waitForTimeout(600);
const res = await p.evaluate(() => {
  const de = document.documentElement, before = de.scrollWidth;
  const card = document.querySelector("div.surface.p-6");
  card.style.minWidth = "0"; const afterCardMinW0 = de.scrollWidth;
  // text forcers: under a forced narrow card, which elements have content wider than their box?
  card.style.width = "280px"; const tf = [];
  for (const el of card.querySelectorAll("*")) { const s = getComputedStyle(el); if (el.scrollWidth > el.clientWidth + 2 || s.whiteSpace === "nowrap" || s.whiteSpace === "pre") tf.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === "string" ? el.className : "").slice(0, 80), sw: el.scrollWidth, cw: el.clientWidth, ws: s.whiteSpace, text: (el.textContent || "").trim().slice(0, 40) }); }
  card.style.width = ""; card.style.minWidth = "";
  // and the same text-forcer scan over the WHOLE page at natural size
  const page = []; for (const el of document.querySelectorAll("body *")) { if (el.closest(".leaflet-container")) continue; const s = getComputedStyle(el); if (s.position === "fixed") continue; if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) page.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === "string" ? el.className : "").slice(0, 80), sw: el.scrollWidth, cw: el.clientWidth, ws: s.whiteSpace, text: (el.textContent || "").trim().slice(0, 40) }); }
  return { before, afterCardMinW0, cardTextForcers: tf.slice(0, 8), pageScrollers: page.slice(0, 8) };
});
console.log(JSON.stringify(res, null, 1)); await b.close();
