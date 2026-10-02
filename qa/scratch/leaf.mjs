import { chromium } from "@playwright/test";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true });
const p = await ctx.newPage(); await p.goto("http://localhost:3000/contact", { waitUntil: "networkidle" }).catch(()=>{}); await p.waitForTimeout(600);
const res = await p.evaluate(() => {
  const W = document.documentElement.clientWidth; const over = [];
  for (const el of document.querySelectorAll("body *")) { const rc = el.getBoundingClientRect(); if (rc.right > W + 1 && rc.width > 0) over.push(el); }
  const leaves = over.filter(el => !over.some(o => o !== el && el.contains(o)));
  return leaves.slice(0, 8).map(el => { const s = getComputedStyle(el); const rc = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), cls: (typeof el.className === "string" ? el.className : "").slice(0, 100), right: Math.round(rc.right), w: Math.round(rc.width), ws: s.whiteSpace, ow: s.overflowWrap, display: s.display, text: (el.textContent || "").trim().slice(0, 60), href: el.getAttribute("href") || "" }; });
});
console.log(JSON.stringify(res, null, 1)); await b.close();
