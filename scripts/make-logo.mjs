/**
 * Builds the site-chrome logo assets from the supplied brand lockup.
 *
 *   node scripts/make-logo.mjs ~/Downloads/flexi-logo.png
 *
 * Two problems with using the supplied PNG directly, both of which this fixes:
 *
 * 1. Site chrome is ALWAYS on dark navy (`bg-brand-900/55` in the header,
 *    solid navy in the footer). The lockup's globe art is mid-grey and its
 *    tagline is near-black, so both disappear. A "reverse" logo is what a
 *    designer would supply for this; here it is derived — red stays red,
 *    everything else is knocked out to white.
 *
 * 2. The lockup is near-square and stacked, with the tagline as its bottom
 *    band. At a 44px header height that tagline renders about 1px tall, which
 *    reads as dirt rather than text. The header therefore gets a version
 *    cropped above the tagline; the footer, where there is room, keeps it.
 *
 * Output is committed. Re-run only when the source lockup changes.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src) throw new Error("usage: node scripts/make-logo.mjs <path-to-logo.png>");

const OUT = join(process.cwd(), "public", "img");

/** Red enough to be brand red rather than art or type. */
const isRed = (r, g, b) => r > 140 && r - g > 45 && r - b > 45;

const trimmed = await sharp(src).trim().ensureAlpha();
const { data, info } = await trimmed.raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

/**
 * The tagline sits below a thin fully-transparent gap. Find the lowest such
 * gap in the bottom third and cut there, rather than hardcoding a pixel row
 * that silently becomes wrong the moment the lockup is redrawn.
 */
const rowIsEmpty = (y) => {
  for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 16) return false;
  return true;
};
let cut = height;
for (let y = Math.floor(height * 0.66); y < height; y++) {
  if (rowIsEmpty(y)) cut = y;
}
if (cut === height) {
  console.warn("no tagline gap found — footer logo will include the tagline");
}

/**
 * Where the wordmark starts. The circle and the wordmark touch, so there is no
 * transparent row to split on — but the wordmark is left-aligned to the full
 * lockup width while the circle is inset, so the first row whose content
 * reaches the left edge is the top of the "F".
 */
const rowLeftmost = (y) => {
  for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 16) return x;
  return width;
};
let markCut = cut;
for (let y = Math.floor(height * 0.5); y < cut; y++) {
  if (rowLeftmost(y) < width * 0.05) {
    markCut = y;
    break;
  }
}

/** Red kept, everything else knocked out to white. Alpha untouched. */
const knockout = Buffer.from(data);
for (let i = 0; i < knockout.length; i += 4) {
  if (knockout[i + 3] === 0) continue;
  const [r, g, b] = [knockout[i], knockout[i + 1], knockout[i + 2]];
  if (!isRed(r, g, b)) {
    knockout[i] = 255;
    knockout[i + 1] = 255;
    knockout[i + 2] = 255;
  }
}

const raw = { raw: { width, height, channels: 4 } };

/**
 * Content bounding box of a horizontal slice, computed against an explicit
 * alpha threshold.
 *
 * `sharp.trim()` is not usable here: the source carries stray pixels at
 * alpha 1–16 along its edges — invisible, but enough to defeat trim's own
 * threshold, so it returned the slice at full width. That left the header mark
 * with a 25% empty right margin, which reads as a large gap between the mark
 * and the wordmark next to it and cannot be tuned away with CSS.
 */
const bbox = (top, bottom, alphaMin = 24) => {
  let x0 = width, x1 = -1, y0 = bottom, y1 = -1;
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < alphaMin) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error(`empty slice ${top}..${bottom}`);
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
};

const targets = [
  /**
   * Header: the mark alone. The stacked lockup at a 44px header height is
   * ~50px wide and its wordmark is an illegible smear, so `Brand` pairs this
   * mark with the wordmark set as real text — which stays crisp at any size,
   * is selectable, and is read correctly by a screen reader.
   */
  ["logo-flexi-mark.webp", knockout, { height: markCut, label: "header mark (knockout)" }],
  // Footer: full lockup including tagline, where there is room for it.
  ["logo-flexi.webp", knockout, { height, label: "footer (knockout, full lockup)" }],
  // Kept for any light-background surface (e-mail, invoice, favicon source).
  ["logo-flexi-dark.webp", data, { height, label: "light backgrounds (as supplied)" }]
];

for (const [name, buf, { height: h, label }] of targets) {
  const box = bbox(0, h);
  const info2 = await sharp(buf, raw)
    .extract(box)
    .resize({ height: 320, withoutEnlargement: true })
    .webp({ quality: 92, effort: 6 })
    .toFile(join(OUT, name));
  console.log(
    `${name.padEnd(24)} ${info2.width}x${info2.height}  ${String(Math.round(info2.size / 1024)).padStart(3)} KB  ${label}`
  );
}

writeFileSync(
  join(OUT, "logo-flexi.json"),
  JSON.stringify({ source: src, trimmed: `${width}x${height}`, wordmarkStartsRow: markCut, taglineCutRow: cut }, null, 2) + "\n"
);
