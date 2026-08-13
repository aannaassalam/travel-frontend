/**
 * Generates the site's artwork as SVG scenes into public/img/.
 *
 * The look is deliberate: cinematic gradient illustration with film grain and
 * atmospheric depth, not flat vector clipart. Generated SVG cannot fake a
 * photograph, so it does not try — it commits to an editorial illustration
 * style that reads as intentional at any size.
 *
 * Four techniques do most of the work:
 *   1. Aerial perspective — every receding layer is mixed toward the horizon
 *      colour, so distance reads as haze rather than as a darker shade.
 *   2. Grain — an feTurbulence overlay at low opacity. This single filter is
 *      what stops a gradient from looking like a CSS demo.
 *   3. Soft light — blurred bloom around the key light, a haze band on the
 *      horizon, and light shafts, all at very low alpha.
 *   4. Curved silhouettes via Catmull-Rom splines instead of triangles.
 *
 * No dependencies, seeded, deterministic. Run: node scripts/gen-images.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "img");
const W = 1600;
const H = 1000;

/* ---------------------------------------------------------------- utilities */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const n = (v) => Math.round(v * 10) / 10;
const between = (rand, a, b) => a + rand() * (b - a);
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

const rgb = (hex) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const hex = ([r, g, b]) =>
  "#" +
  [r, g, b]
    .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
    .join("");

/** Linear blend. The whole aerial-perspective trick is one call to this. */
const mix = (a, b, t) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return hex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
};
const shade = (c, t) => mix(c, t < 0 ? "#000000" : "#ffffff", Math.abs(t));

const lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
  stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("") +
  `</linearGradient>`;

const rg = (id, stops, extra = "") =>
  `<radialGradient id="${id}" ${extra}>` +
  stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("") +
  `</radialGradient>`;

/**
 * Catmull-Rom through the given points, emitted as cubic beziers. Ridge lines,
 * shorelines and cloud banks all come from this — a curve reads as landscape,
 * a polyline reads as a chart.
 */
function spline(points, close = false) {
  if (points.length < 2) return "";
  const p = points;
  let d = `M ${n(p[0][0])} ${n(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${n(c1[0])} ${n(c1[1])}, ${n(c2[0])} ${n(c2[1])}, ${n(p2[0])} ${n(p2[1])}`;
  }
  return close ? d + " Z" : d;
}

/* ------------------------------------------------------------- shared defs */

/**
 * Grain, bloom and vignette. Present on every scene — consistency across the
 * set is what makes generated artwork look art-directed rather than assembled.
 */
const SHARED_DEFS = `
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" seed="7"/>
  <feColorMatrix type="saturate" values="0"/>
</filter>
<filter id="bloom" x="-60%" y="-60%" width="220%" height="220%">
  <feGaussianBlur stdDeviation="46"/>
</filter>
<filter id="haze" x="-30%" y="-200%" width="160%" height="500%">
  <feGaussianBlur stdDeviation="26"/>
</filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur stdDeviation="12"/>
</filter>
${rg("vig", [
  [0.55, "#000814", 0],
  [1, "#000814", 0.38]
])}
`;

/** The two overlays that close every scene, in order. */
const FINISH =
  `<rect width="${W}" height="${H}" fill="url(#vig)"/>` +
  `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.16" style="mix-blend-mode:overlay"/>`;

const wrap = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" preserveAspectRatio="xMidYMid slice">` +
  `<defs>${SHARED_DEFS}${defs}</defs>${body}${FINISH}</svg>`;

/* ------------------------------------------------------------------ palettes */

/**
 * Graded like film stock: cool, desaturated shadows and a warm key. Each ramp
 * runs zenith → horizon, so `[at(1)]` is always the horizon colour that every
 * receding land layer gets mixed toward.
 */
const SKIES = {
  dusk: ["#141034", "#3A1F53", "#7E3355", "#C25A4B", "#EC8B4E", "#F7C982"],
  blueHour: ["#0A0F26", "#152047", "#31406F", "#5D5E8E", "#9B7B97", "#D9A894"],
  dawn: ["#22355E", "#4C6B99", "#8FA9C2", "#CBCFC8", "#EFD9BA", "#F9EBD2"],
  // Bright enough to read as daylight. The first version started too dark at
  // the zenith and every daytime scene came out looking like late evening.
  day: ["#1E6EA8", "#3B90C4", "#69B2D6", "#A2CFE0", "#D5E8E4", "#F4EFDE"],
  tropic: ["#083F63", "#0F73A0", "#3FA9BF", "#8ACFCD", "#D2E9E0", "#F4F0DC"],
  night: ["#05070F", "#0A0F22", "#111A33", "#1B2545", "#2C3355", "#41425F"]
};

const skyRamp = (mood) => {
  const c = SKIES[mood];
  return (t) => {
    const x = Math.max(0, Math.min(0.999, t)) * (c.length - 1);
    const i = Math.floor(x);
    return mix(c[i], c[i + 1] ?? c[i], x - i);
  };
};

/* --------------------------------------------------------------- primitives */

function sky(id, mood) {
  const c = SKIES[mood];
  return {
    defs: lg(
      id,
      c.map((col, i) => [i / (c.length - 1), col])
    ),
    body: `<rect width="${W}" height="${H}" fill="url(#${id})"/>`,
    at: skyRamp(mood),
    horizonColor: c[c.length - 1]
  };
}

/** Key light: a bloom disc, a crisp core and an optional shaft fan. */
function keyLight(rand, x, y, mood, { shafts = true, radius = 46 } = {}) {
  const warm = mood === "night" ? "#E8EEFF" : mood === "day" || mood === "tropic" ? "#FFF7E2" : "#FFE7B8";
  const r = mood === "night" ? 22 : radius;
  let out =
    `<circle cx="${n(x)}" cy="${n(y)}" r="${r * 6}" fill="${warm}" opacity="${mood === "night" ? 0.1 : 0.24}" filter="url(#bloom)"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${r * 2.4}" fill="${warm}" opacity="0.3" filter="url(#bloom)"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${warm}" opacity="0.95"/>`;

  if (shafts && mood !== "night") {
    let fan = "";
    for (let i = 0; i < 7; i++) {
      const a = between(rand, -1.5, 1.5);
      const spread = between(rand, 40, 150);
      fan += `<path d="M ${n(x)} ${n(y)} L ${n(x + Math.sin(a) * 1400 - spread)} ${H + 200} L ${n(
        x + Math.sin(a) * 1400 + spread
      )} ${H + 200} Z" fill="${warm}" opacity="${n(between(rand, 0.02, 0.06))}"/>`;
    }
    out += `<g filter="url(#soft)">${fan}</g>`;
  }
  return out;
}

/** The bright band that sits on every real horizon. Cheap, and badly missed. */
const horizonHaze = (y, color) =>
  `<ellipse cx="${W / 2}" cy="${n(y)}" rx="${W * 0.8}" ry="42" fill="${color}" opacity="0.5" filter="url(#haze)"/>`;

function cloudBank(rand, baseY, tint, count = 5, opacity = 0.5) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const cx = between(rand, -100, W + 100);
    const cy = baseY + between(rand, -150, 150);
    const w = between(rand, 260, 620);
    const h = between(rand, 26, 60);
    const pts = [];
    const steps = 7;
    for (let s = 0; s <= steps; s++) {
      pts.push([
        cx - w / 2 + (w * s) / steps,
        cy - Math.sin((s / steps) * Math.PI) * h * between(rand, 0.55, 1.25)
      ]);
    }
    const d = spline(pts) + ` L ${n(cx + w / 2)} ${n(cy + h * 0.5)} L ${n(cx - w / 2)} ${n(cy + h * 0.5)} Z`;
    out += `<path d="${d}" fill="${tint}" opacity="${n(between(rand, 0.18, opacity))}" filter="url(#soft)"/>`;
  }
  return out;
}

/**
 * Receding ridges. Each layer is mixed toward the horizon colour by its depth,
 * which is what makes distance read as air rather than as paint.
 */
function ridges(rand, { baseY, layers, landColor, hazeColor, drop = 90, amp = 190 }) {
  let out = "";
  for (let L = layers - 1; L >= 0; L--) {
    const t = L / Math.max(1, layers - 1); // 1 = farthest
    const y = baseY - t * drop;
    const color = mix(landColor, hazeColor, t * 0.82);
    const pts = [[-160, y]];
    const step = between(rand, 190, 300);
    for (let x = -160; x <= W + 160; x += step) {
      const peak = y - amp * (1 - t * 0.45) * between(rand, 0.25, 1);
      pts.push([x + step * 0.5, peak]);
      pts.push([x + step, y - amp * 0.16 * rand()]);
    }
    const d = spline(pts) + ` L ${W + 160} ${H + 40} L -160 ${H + 40} Z`;
    out += `<path d="${d}" fill="${color}"/>`;
    // A hairline of light on the ridge crest, catching the key light.
    out += `<path d="${spline(pts)}" fill="none" stroke="${mix(color, "#FFFFFF", 0.35)}" stroke-width="1.6" opacity="${n(0.5 - t * 0.35)}"/>`;
  }
  return out;
}

/** Water with a graded body, a sun column and soft horizontal shimmer. */
function water(rand, id, y, deepColor, hazeColor, sunX) {
  let shimmer = "";
  for (let i = 0; i < 46; i++) {
    const depth = rand();
    const wy = y + 6 + depth * (H - y);
    const near = depth ** 1.4;
    const w = between(rand, 40, 200) * (0.4 + near);
    const wx = sunX == null ? between(rand, 0, W) : sunX - w / 2 + between(rand, -1, 1) * (120 + near * 420);
    shimmer += `<rect x="${n(wx)}" y="${n(wy)}" width="${n(w)}" height="${n(1.5 + near * 4)}" rx="3" fill="#FFFFFF" opacity="${n(
      between(rand, 0.05, 0.3) * (1 - depth * 0.4)
    )}"/>`;
  }
  const column =
    sunX == null
      ? ""
      : `<path d="M ${n(sunX - 26)} ${n(y)} L ${n(sunX + 26)} ${n(y)} L ${n(sunX + 210)} ${H} L ${n(
          sunX - 210
        )} ${H} Z" fill="#FFF3D4" opacity="0.14" filter="url(#soft)"/>`;
  return {
    defs: lg(id, [
      [0, mix(hazeColor, deepColor, 0.35)],
      [0.35, deepColor],
      [1, shade(deepColor, -0.42)]
    ]),
    body:
      `<rect x="0" y="${n(y)}" width="${W}" height="${n(H - y)}" fill="url(#${id})"/>` +
      column +
      shimmer
  };
}

/** Silhouetted skyline. Depth comes from two passes, not from one busy row. */
function skyline(rand, y, nearColor, hazeColor, depth = 0) {
  // Distant blocks are hazed hard and drawn small. The first version mixed them
  // only halfway toward the horizon and kept them full height, so the back row
  // competed with the front instead of sitting behind it.
  const color = mix(nearColor, hazeColor, depth * 0.86);
  let out = "";
  let x = -60;
  while (x < W + 60) {
    const bw = between(rand, 46, 130) * (1 - depth * 0.45);
    const bh = between(rand, 90, 420) * (1 - depth * 0.55);
    const top = y - bh;
    out += `<rect x="${n(x)}" y="${n(top)}" width="${n(bw)}" height="${n(bh + 60)}" fill="${color}"/>`;
    // Vertical light on the side facing the key light.
    out += `<rect x="${n(x)}" y="${n(top)}" width="3" height="${n(bh + 60)}" fill="#FFFFFF" opacity="${n(0.1 - depth * 0.06)}"/>`;
    if (depth < 0.4) {
      const cols = Math.max(1, Math.floor(bw / 22));
      const rows = Math.max(1, Math.floor(bh / 34));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() > 0.34) continue;
          out += `<rect x="${n(x + 9 + c * 22)}" y="${n(top + 16 + r * 34)}" width="6" height="11" rx="1" fill="#FFD79A" opacity="${n(
            between(rand, 0.35, 0.95)
          )}"/>`;
        }
      }
    }
    if (rand() > 0.82) {
      out += `<rect x="${n(x + bw / 2 - 2)}" y="${n(top - 60)}" width="3.5" height="60" fill="${color}"/>`;
      out += `<circle cx="${n(x + bw / 2)}" cy="${n(top - 62)}" r="3.5" fill="#FF7A6B" opacity="0.9"/>`;
    }
    x += bw + between(rand, 4, 20);
  }
  return out;
}

/**
 * Foreground palm.
 *
 * Fronds are filled, tapered blades that arch up and then droop — not strokes
 * radiating from a point, which is what makes a stylised palm read as a spider.
 * Centre fronds reach highest, outer ones fall below the crown, and the whole
 * canopy leans with the trunk.
 */
function palm(rand, x, y, scale, color) {
  const count = 9;
  const arch = between(rand, 62, 88);
  let fronds = "";

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const spread = -1 + 2 * t; // −1 hard left … +1 hard right
    const len = between(rand, 150, 200) * (0.72 + 0.4 * (1 - Math.abs(spread)));
    const tipX = spread * len * 1.15;
    // Centre fronds rise; the further out, the further the tip falls.
    const tipY = -arch + Math.abs(spread) ** 1.5 * arch * 2.1 + between(rand, 10, 46);
    const cx = tipX * 0.42;
    const cy = -arch * 1.15;
    const blade = between(rand, 20, 30);
    const tone = mix(color, i % 2 ? "#FFFFFF" : "#000000", 0.07);

    fronds +=
      `<path d="M 0 0 Q ${n(cx)} ${n(cy - blade)} ${n(tipX)} ${n(tipY)} Q ${n(cx)} ${n(cy + blade)} 0 0 Z" fill="${tone}"/>` +
      // Midrib: one hairline of light, which is what sells the blade as a leaf.
      `<path d="M 0 0 Q ${n(cx)} ${n(cy)} ${n(tipX)} ${n(tipY)}" fill="none" stroke="${mix(
        color,
        "#FFFFFF",
        0.3
      )}" stroke-width="1.8" opacity="0.45"/>`;
  }

  // Coconuts at the crown.
  let nuts = "";
  for (let i = 0; i < 3; i++) {
    nuts += `<circle cx="${n(between(rand, -18, 18))}" cy="${n(between(rand, 4, 18))}" r="${n(
      between(rand, 7, 10)
    )}" fill="${mix(color, "#000000", 0.25)}"/>`;
  }

  const lean = between(rand, -34, 34);
  return (
    `<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">` +
    // Trunk: tapered, so it is not a pipe.
    `<path d="M -13 0 Q ${n(-9 + lean * 0.35)} -110 ${n(-5 + lean * 0.75)} -215 Q ${n(lean * 0.9)} -270 ${n(
      lean - 6
    )} -302 L ${n(lean + 7)} -300 Q ${n(lean * 0.9 + 12)} -268 ${n(6 + lean * 0.75)} -214 Q ${n(
      10 + lean * 0.35
    )} -108 13 0 Z" fill="${color}"/>` +
    `<path d="M -6 0 Q ${n(-3 + lean * 0.35)} -110 ${n(lean * 0.75)} -215" fill="none" stroke="${mix(
      color,
      "#FFFFFF",
      0.22
    )}" stroke-width="3" opacity="0.5"/>` +
    `<g transform="translate(${n(lean)} -300)">${fronds}${nuts}</g>` +
    `</g>`
  );
}

function acacia(rand, x, y, scale, color) {
  const canopy = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    canopy.push([-190 + t * 380, -Math.sin(t * Math.PI) * between(rand, 40, 70) - 130]);
  }
  return (
    `<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">` +
    `<path d="${spline([
      [0, 0],
      [-8, -60],
      [4, -110]
    ])}" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"/>` +
    `<path d="M 4 -110 L -70 -145 M 4 -110 L 70 -140" stroke="${color}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="${spline(canopy)} L 190 -118 L -190 -118 Z" fill="${color}"/>` +
    `<path d="${spline(canopy)}" fill="none" stroke="${mix(color, "#FFFFFF", 0.3)}" stroke-width="2.5" opacity="0.45"/>` +
    `</g>`
  );
}

/** Framing foliage in a top corner — the oldest trick for depth in a poster. */
function foliageCorner(rand, side, color) {
  const flip = side === "left" ? 1 : -1;
  const ox = side === "left" ? -40 : W + 40;
  let out = "";
  for (let i = 0; i < 5; i++) {
    const baseY = between(rand, -30, 200);
    const len = between(rand, 200, 400);
    const pts = [
      [ox, baseY],
      [ox + flip * len * 0.4, baseY + between(rand, 30, 90)],
      [ox + flip * len * 0.75, baseY + between(rand, 80, 170)],
      [ox + flip * len, baseY + between(rand, 130, 240)]
    ];
    out += `<path d="${spline(pts)}" fill="none" stroke="${color}" stroke-width="${n(between(rand, 16, 34))}" stroke-linecap="round" opacity="0.95"/>`;
  }
  return out;
}

function birds(rand, count, yMax) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = between(rand, 200, W - 200);
    const y = between(rand, 120, yMax);
    const s = between(rand, 0.7, 1.5);
    out += `<path d="M ${n(x)} ${n(y)} q ${n(9 * s)} ${n(-8 * s)} ${n(18 * s)} 0 q ${n(9 * s)} ${n(-8 * s)} ${n(
      18 * s
    )} 0" fill="none" stroke="#0B1220" stroke-opacity="0.32" stroke-width="${n(2.4 * s)}" stroke-linecap="round"/>`;
  }
  return out;
}

/* ------------------------------------------------------------------ scenes */

function sceneLandscape(rand, mood, landColor) {
  const s = sky("sk", mood);
  const horizon = H * 0.56;
  const sunY = horizon - between(rand, 40, 170);
  const sunX = between(rand, W * 0.25, W * 0.75);
  const wa = water(rand, "wa", horizon, mix(landColor, "#0E3D63", 0.65), s.horizonColor, sunX);
  const fg = mix(landColor, "#05070F", 0.66);

  let body =
    s.body +
    (mood === "night" ? stars(rand, 160, horizon - 80) : "") +
    keyLight(rand, sunX, sunY, mood) +
    cloudBank(rand, horizon - 300, s.at(0.75), 6, 0.4) +
    ridges(rand, {
      baseY: horizon + 6,
      layers: 4,
      landColor,
      hazeColor: s.horizonColor,
      drop: 110,
      amp: 230
    }) +
    horizonHaze(horizon, s.at(0.95)) +
    wa.body;

  // Foreground shoreline, dark and low-contrast so the eye stays on the light.
  const shore = [];
  for (let i = 0; i <= 8; i++) {
    shore.push([-80 + (i * (W + 160)) / 8, H - between(rand, 130, 250)]);
  }
  body += `<path d="${spline(shore)} L ${W + 80} ${H} L -80 ${H} Z" fill="${fg}"/>`;
  body += palm(rand, between(rand, 90, 220), H - 120, 0.95, mix(fg, "#000000", 0.35));
  body += palm(rand, between(rand, 240, 380), H - 90, 0.62, mix(fg, "#000000", 0.25));
  body += palm(rand, between(rand, W - 300, W - 120), H - 110, 0.85, mix(fg, "#000000", 0.35));
  if (mood !== "night") body += birds(rand, 5, horizon - 160);
  return wrap(s.defs + wa.defs, body);
}

function stars(rand, count, maxY) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const r = between(rand, 0.6, 1.9);
    out += `<circle cx="${n(between(rand, 0, W))}" cy="${n(between(rand, 0, maxY))}" r="${n(r)}" fill="#FFFFFF" opacity="${n(
      between(rand, 0.2, 0.9)
    )}"/>`;
  }
  return out;
}

function sceneSavanna(rand, mood) {
  const s = sky("sk", mood);
  const horizon = H * 0.62;
  const sunX = between(rand, W * 0.3, W * 0.7);
  const sunY = horizon - between(rand, 30, 120);
  const ground = mood === "dusk" ? "#8A6A2E" : "#B79542";

  let body =
    s.body +
    keyLight(rand, sunX, sunY, mood) +
    cloudBank(rand, horizon - 260, s.at(0.7), 5, 0.35) +
    ridges(rand, {
      baseY: horizon,
      layers: 3,
      landColor: "#5C6F72",
      hazeColor: s.horizonColor,
      drop: 60,
      amp: 110
    }) +
    horizonHaze(horizon, s.at(0.95));

  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const y = horizon + t * (H - horizon) * 0.9;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      pts.push([-80 + (k * (W + 160)) / 6, y + between(rand, -26, 26)]);
    }
    body += `<path d="${spline(pts)} L ${W + 80} ${H} L -80 ${H} Z" fill="${mix(
      mix(ground, s.horizonColor, (1 - t) * 0.55),
      "#1A1206",
      t * 0.55
    )}"/>`;
  }

  body += acacia(rand, between(rand, 200, 420), H - 140, 1.05, mix(ground, "#05070F", 0.78));
  body += acacia(rand, between(rand, 900, 1150), H - 250, 0.6, mix(ground, "#05070F", 0.6));
  body += acacia(rand, W - between(rand, 90, 200), H - 90, 0.85, mix(ground, "#05070F", 0.85));
  body += birds(rand, 6, horizon - 140);
  return wrap(s.defs, body);
}

function sceneRiver(rand, mood) {
  const s = sky("sk", mood);
  const horizon = H * 0.5;
  const sunX = between(rand, W * 0.35, W * 0.65);
  const sunY = horizon - between(rand, 30, 120);
  const bank = "#20463C";
  const wa = water(rand, "wa", horizon, mix(bank, "#0F5476", 0.7), s.horizonColor, sunX);

  let body =
    s.body +
    (mood === "night" ? stars(rand, 130, horizon - 60) : "") +
    keyLight(rand, sunX, sunY, mood) +
    cloudBank(rand, horizon - 280, s.at(0.72), 5, 0.4) +
    ridges(rand, {
      baseY: horizon + 4,
      layers: 3,
      landColor: bank,
      hazeColor: s.horizonColor,
      drop: 70,
      amp: 130
    }) +
    horizonHaze(horizon, s.at(0.95)) +
    wa.body;

  // Pirogues, smaller and hazier the further up the river they sit.
  for (let i = 0; i < 4; i++) {
    const depth = rand();
    const by = horizon + 60 + depth * (H - horizon - 140);
    const bx = between(rand, 200, W - 200);
    const sc = 0.45 + depth * 0.85;
    const tone = mix("#1A120C", s.horizonColor, (1 - depth) * 0.5);
    body +=
      `<g transform="translate(${n(bx)} ${n(by)}) scale(${n(sc)})">` +
      `<path d="M -86 0 Q 0 30 86 0 L 68 16 Q 0 42 -68 16 Z" fill="${tone}"/>` +
      `<rect x="-3" y="-74" width="5" height="74" fill="${tone}"/>` +
      `<path d="M 4 -72 L 56 -8 L 4 -8 Z" fill="${mix("#F6EEDC", s.horizonColor, (1 - depth) * 0.55)}" opacity="0.95"/>` +
      `<ellipse cx="0" cy="20" rx="90" ry="7" fill="#000000" opacity="0.16"/>` +
      `</g>`;
  }

  const fg = mix(bank, "#05070F", 0.7);
  body += foliageCorner(rand, "left", fg);
  body += palm(rand, 120, H + 40, 1.15, fg);
  body += palm(rand, W - 110, H + 60, 1, fg);
  return wrap(s.defs + wa.defs, body);
}

function sceneCity(rand, mood) {
  const s = sky("sk", mood);
  const horizon = H * 0.66;
  const sunX = between(rand, W * 0.3, W * 0.7);
  const wa = water(rand, "wa", horizon + 40, mix("#0E3D63", "#05070F", 0.35), s.horizonColor, sunX);

  let body =
    s.body +
    (mood === "night" || mood === "blueHour" ? stars(rand, 150, horizon - 220) : "") +
    keyLight(rand, sunX, horizon - between(rand, 180, 300), mood, { shafts: false, radius: 40 }) +
    cloudBank(rand, horizon - 380, s.at(0.65), 4, 0.34) +
    skyline(rand, horizon - 30, "#101A33", s.horizonColor, 0.62) +
    skyline(rand, horizon + 42, "#080D1C", s.horizonColor, 0) +
    horizonHaze(horizon + 20, s.at(0.9)) +
    wa.body;

  // Reflection: the skyline again, flipped, blurred and very faint.
  body += `<g transform="translate(0 ${n((horizon + 42) * 2 + 60)}) scale(1 -1)" opacity="0.16" filter="url(#soft)">${skyline(
    rng(11),
    horizon + 42,
    "#0B1224",
    s.horizonColor,
    0
  )}</g>`;
  return wrap(s.defs + wa.defs, body);
}

/**
 * Resort exterior, composed as the shot every hotel actually leads with: pool
 * across the foreground, building behind it, sky above. The earlier version put
 * the pool in a corner and left half the frame as empty deck — the composition
 * was the problem, not the level of detail.
 */
function sceneResort(rand, mood) {
  const s = sky("sk", mood);
  const horizon = H * 0.34;
  const warm = mood === "dusk" || mood === "dawn";
  const deck = mix("#E7DCC6", s.horizonColor, 0.25);
  const wall = pick(rand, ["#F7F2E7", "#F0E7D8", "#FAF6EE"]);
  const deckTop = H * 0.6;
  const poolTop = H * 0.72;

  const defs =
    lg("pool", [
      [0, mix("#8FE0E6", s.horizonColor, 0.35)],
      [0.3, "#2FA5C4"],
      [1, "#0B4E6B"]
    ]) +
    lg("deckg", [
      [0, mix(deck, "#FFFFFF", 0.22)],
      [1, mix(deck, "#8A7250", 0.28)]
    ]) +
    lg(
      "wallg2",
      [
        [0, mix(wall, "#FFFFFF", 0.18)],
        [1, mix(wall, "#7A6244", 0.28)]
      ],
      0,
      0,
      1,
      0
    );

  let body =
    s.body +
    keyLight(rand, W * 0.78, horizon - 130, mood) +
    cloudBank(rand, horizon - 160, s.at(0.68), 6, 0.45) +
    ridges(rand, {
      baseY: horizon + 40,
      layers: 3,
      landColor: "#2F5F4C",
      hazeColor: s.horizonColor,
      drop: 40,
      amp: 120
    }) +
    horizonHaze(horizon + 30, s.at(0.94));

  /* --- building: centre of frame, wide, with real depth ------------------- */
  const bx = 210;
  const bw = 1180;
  const bTop = H * 0.2;
  const bBot = deckTop;

  // Recessed wings behind the main block, so the facade is not one flat plane.
  body +=
    `<rect x="${n(bx + bw - 210)}" y="${n(bTop + 46)}" width="330" height="${n(bBot - bTop - 46)}" fill="${mix(
      wall,
      s.horizonColor,
      0.42
    )}"/>` +
    `<rect x="${n(bx - 160)}" y="${n(bTop + 70)}" width="260" height="${n(bBot - bTop - 70)}" fill="${mix(
      wall,
      s.horizonColor,
      0.5
    )}"/>` +
    `<rect x="${bx}" y="${n(bTop)}" width="${bw}" height="${n(bBot - bTop)}" fill="url(#wallg2)"/>` +
    `<rect x="${bx - 30}" y="${n(bTop - 22)}" width="${bw + 60}" height="26" rx="5" fill="${mix(wall, "#000000", 0.36)}"/>` +
    `<rect x="${bx}" y="${n(bTop + 4)}" width="${bw}" height="18" fill="#000000" opacity="0.12"/>` +
    `<rect x="${n(bx + bw - 14)}" y="${n(bTop)}" width="14" height="${n(bBot - bTop)}" fill="#FFFFFF" opacity="0.3"/>`;

  // Four guest floors. The rhythm is broken on purpose — some lights on, some
  // shutters dark. A perfect grid of identical windows reads as a spreadsheet.
  const floors = 4;
  const floorH = (bBot - bTop - 130) / floors;
  for (let f = 0; f < floors; f++) {
    const fy = bTop + 54 + f * floorH;
    body +=
      `<rect x="${bx - 14}" y="${n(fy + floorH - 26)}" width="${bw + 28}" height="11" rx="3" fill="${mix(wall, "#000000", 0.32)}"/>` +
      `<rect x="${bx - 14}" y="${n(fy + floorH - 15)}" width="${bw + 28}" height="13" fill="#000000" opacity="0.15"/>`;
    for (let c = 0; c < 9; c++) {
      const wx = bx + 46 + c * 124;
      const lit = warm && rand() > 0.42;
      body +=
        `<rect x="${n(wx)}" y="${n(fy)}" width="82" height="${n(floorH - 40)}" rx="3" fill="${
          lit ? "#FFD79A" : "#123A5F"
        }" opacity="${n(lit ? between(rand, 0.72, 0.96) : between(rand, 0.45, 0.78))}"/>` +
        `<path d="M ${n(wx)} ${n(fy)} L ${n(wx + 82)} ${n(fy)} L ${n(wx + 34)} ${n(fy + floorH - 40)} L ${n(wx)} ${n(
          fy + floorH - 40
        )} Z" fill="#FFFFFF" opacity="0.15"/>` +
        `<g stroke="${mix(wall, "#000000", 0.44)}" stroke-width="1.7" opacity="0.75">` +
        `<path d="M ${n(wx - 12)} ${n(fy + floorH - 40)} L ${n(wx - 12)} ${n(fy + floorH - 26)}"/>` +
        `<path d="M ${n(wx + 41)} ${n(fy + floorH - 40)} L ${n(wx + 41)} ${n(fy + floorH - 26)}"/>` +
        `<path d="M ${n(wx + 94)} ${n(fy + floorH - 40)} L ${n(wx + 94)} ${n(fy + floorH - 26)}"/>` +
        `</g>`;
      if (lit) {
        body += `<circle cx="${n(wx + 41)}" cy="${n(fy + floorH / 2 - 20)}" r="60" fill="#FFD79A" opacity="0.16" filter="url(#bloom)"/>`;
      }
    }
  }

  // Ground-floor lobby: full-height glazing with a warm interior wash.
  const lobbyY = bBot - 110;
  body +=
    `<rect x="${bx + 30}" y="${n(lobbyY)}" width="${bw - 60}" height="110" fill="#123A5F" opacity="0.5"/>` +
    `<rect x="${bx + 30}" y="${n(lobbyY)}" width="${bw - 60}" height="110" fill="#FFCF8A" opacity="${warm ? 0.62 : 0.3}"/>`;
  for (let i = 1; i < 9; i++) {
    body += `<rect x="${n(bx + 30 + i * ((bw - 60) / 9))}" y="${n(lobbyY)}" width="5" height="110" fill="${mix(
      wall,
      "#000000",
      0.38
    )}"/>`;
  }
  body += `<ellipse cx="${n(bx + bw / 2)}" cy="${n(bBot + 20)}" rx="${n(bw * 0.4)}" ry="70" fill="#FFCF8A" opacity="${
    warm ? 0.24 : 0.11
  }" filter="url(#bloom)"/>`;

  /* --- deck strip: hedge, loungers, parasols ------------------------------ */
  body +=
    `<rect x="0" y="${n(deckTop)}" width="${W}" height="${n(H - deckTop)}" fill="url(#deckg)"/>` +
    `<rect x="0" y="${n(deckTop)}" width="${W}" height="4" fill="#FFFFFF" opacity="0.35"/>`;
  for (let i = 0; i < 5; i++) {
    body += `<path d="M 0 ${n(deckTop + 14 + i * 16)} L ${W} ${n(deckTop + 14 + i * 16)}" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.4"/>`;
  }

  // A hedge line along the base, which grounds the building on the deck.
  for (let i = 0; i < 16; i++) {
    const gx = 60 + i * 100 + between(rand, -18, 18);
    body +=
      `<g transform="translate(${n(gx)} ${n(deckTop + 6)}) scale(${n(between(rand, 0.5, 0.8))})">` +
      `<ellipse cx="0" cy="4" rx="60" ry="10" fill="#000000" opacity="0.16"/>` +
      `<circle cx="-20" cy="-16" r="28" fill="#2F6B4F"/>` +
      `<circle cx="18" cy="-22" r="32" fill="#3E8A63"/>` +
      `<circle cx="0" cy="-8" r="26" fill="#255741"/>` +
      `</g>`;
  }

  for (let i = 0; i < 5; i++) {
    const lx = 90 + i * 320;
    const ly = poolTop - 44;
    body +=
      `<g transform="translate(${lx} ${n(ly)})">` +
      `<ellipse cx="56" cy="32" rx="82" ry="11" fill="#000000" opacity="0.2" filter="url(#soft)"/>` +
      `<rect x="0" y="0" width="118" height="16" rx="8" fill="#FDFBF6"/>` +
      `<rect x="84" y="-30" width="34" height="32" rx="9" fill="#FDFBF6" transform="rotate(-20 84 -30)"/>` +
      `<rect x="14" y="16" width="7" height="18" fill="${mix(deck, "#000000", 0.32)}"/>` +
      `<rect x="96" y="16" width="7" height="18" fill="${mix(deck, "#000000", 0.32)}"/>` +
      `</g>`;
    if (i % 2 === 1) {
      body +=
        `<g transform="translate(${lx + 175} ${n(ly + 34)})">` +
        `<ellipse cx="0" cy="4" rx="24" ry="6" fill="#000000" opacity="0.22"/>` +
        `<rect x="-4" y="-168" width="8" height="168" fill="${mix(deck, "#000000", 0.42)}"/>` +
        `<path d="M -96 -168 Q 0 -220 96 -168 Q 0 -150 -96 -168 Z" fill="${warm ? "#E8A33D" : "#FDFBF6"}"/>` +
        `</g>`;
    }
  }

  /* --- pool across the foreground, with a stretched reflection ------------ */
  body +=
    `<rect x="0" y="${n(poolTop - 18)}" width="${W}" height="22" fill="${mix(deck, "#FFFFFF", 0.45)}"/>` +
    `<rect x="0" y="${n(poolTop)}" width="${W}" height="${n(H - poolTop)}" fill="url(#pool)"/>`;
  // Vertical smears of the lit facade — the cheapest convincing water reflection.
  for (let i = 0; i < 10; i++) {
    body += `<rect x="${n(between(rand, 100, W - 200))}" y="${n(poolTop)}" width="${n(
      between(rand, 40, 130)
    )}" height="${n(H - poolTop)}" fill="${warm ? "#FFD79A" : "#FFFFFF"}" opacity="${n(between(rand, 0.05, 0.13))}"/>`;
  }
  for (let i = 0; i < 40; i++) {
    body += `<rect x="${n(between(rand, 0, W - 100))}" y="${n(between(rand, poolTop + 14, H - 10))}" width="${n(
      between(rand, 50, 190)
    )}" height="${n(between(rand, 3, 6))}" rx="3" fill="#FFFFFF" opacity="${n(between(rand, 0.12, 0.4))}"/>`;
  }
  for (let i = 0; i < 3; i++) {
    body += `<rect x="${n(120 + i * 10)}" y="${n(poolTop + 20 + i * 34)}" width="${n(200 - i * 30)}" height="26" rx="8" fill="#FFFFFF" opacity="${n(
      0.26 - i * 0.06
    )}"/>`;
  }

  const fg = "#1E4A38";
  body += palm(rand, 120, poolTop + 40, 1.25, mix(fg, "#000000", 0.25));
  body += palm(rand, W - 90, poolTop + 70, 1.35, mix(fg, "#000000", 0.3));
  body += palm(rand, 1420, deckTop + 12, 0.72, mix(fg, s.horizonColor, 0.15));
  return wrap(s.defs + defs, body);
}
/**
 * Hotel room in one-point perspective. Flat elevation reads as a floor plan;
 * a vanishing point is what makes a room feel like a place you could walk into.
 */
function sceneRoom(rand) {
  const wall = pick(rand, ["#EFE7DA", "#E7E3DA", "#F2ECE1", "#E4E9EC", "#EDE4D8"]);
  const floor = pick(rand, ["#8F6242", "#7C5535", "#9C7049"]);
  const accent = pick(rand, ["#123A5F", "#0A2540", "#7C5A34", "#2F5F4C", "#5A3F52"]);

  // Vanishing point, off-centre so the composition is not symmetrical.
  const vx = W * 0.58;
  const vy = H * 0.5;
  // Back wall.
  const bl = W * 0.24;
  const br = W * 0.86;
  const bt = H * 0.16;
  const bb = H * 0.74;

  const defs =
    lg("backwall", [
      [0, mix(wall, "#FFFFFF", 0.16)],
      [1, mix(wall, "#000000", 0.14)]
    ]) +
    lg("sidewall", [
      [0, mix(wall, "#000000", 0.3)],
      [1, mix(wall, "#000000", 0.1)]
    ], 0, 0, 1, 0) +
    lg("floorg", [
      [0, mix(floor, "#000000", 0.28)],
      [1, mix(floor, "#FFFFFF", 0.12)]
    ]) +
    lg("view", [
      [0, "#BFE3F3"],
      [0.55, "#7FC3E4"],
      [1, "#E8D9B8"]
    ]) +
    lg("lightpool", [
      [0, "#FFEFC7", 0.55],
      [1, "#FFEFC7", 0]
    ]) +
    // Floorboards must be clipped to the floor plane, or the converging lines
    // run straight up the side walls and the perspective falls apart.
    `<clipPath id="floorclip"><path d="M 0 ${H} L ${n(bl)} ${n(bb)} L ${n(br)} ${n(bb)} L ${W} ${H} Z"/></clipPath>`;

  let body =
    // Ceiling, left wall, right wall, floor — each a trapezoid to the VP.
    `<path d="M 0 0 L ${W} 0 L ${n(br)} ${n(bt)} L ${n(bl)} ${n(bt)} Z" fill="${mix(wall, "#FFFFFF", 0.3)}"/>` +
    `<path d="M 0 0 L ${n(bl)} ${n(bt)} L ${n(bl)} ${n(bb)} L 0 ${H} Z" fill="url(#sidewall)"/>` +
    `<path d="M ${W} 0 L ${n(br)} ${n(bt)} L ${n(br)} ${n(bb)} L ${W} ${H} Z" fill="url(#sidewall)"/>` +
    `<rect x="${n(bl)}" y="${n(bt)}" width="${n(br - bl)}" height="${n(bb - bt)}" fill="url(#backwall)"/>` +
    `<path d="M 0 ${H} L ${n(bl)} ${n(bb)} L ${n(br)} ${n(bb)} L ${W} ${H} Z" fill="url(#floorg)"/>`;

  // Floorboards converging on the vanishing point.
  body += `<g clip-path="url(#floorclip)">`;
  for (let i = -8; i <= 8; i++) {
    const fx = vx + i * 210;
    body += `<path d="M ${n(fx)} ${H + 40} L ${n(vx + i * 62)} ${n(bb)}" stroke="${mix(floor, "#000000", 0.35)}" stroke-width="2" opacity="0.5"/>`;
  }
  body += `</g>`;
  body += `<rect x="${n(bl)}" y="${n(bb - 10)}" width="${n(br - bl)}" height="10" fill="${mix(wall, "#000000", 0.35)}"/>`;

  // Window on the right wall, with the light pool it casts on the floor.
  body +=
    `<path d="M ${n(br)} ${n(bt + 60)} L ${W - 90} ${n(bt + 10)} L ${W - 90} ${n(bb - 40)} L ${n(br)} ${n(bb - 90)} Z" fill="url(#view)"/>` +
    `<path d="M ${n(br)} ${n(bt + 60)} L ${W - 90} ${n(bt + 10)} L ${W - 90} ${n(bb - 40)} L ${n(br)} ${n(bb - 90)} Z" fill="none" stroke="${mix(
      wall,
      "#000000",
      0.4
    )}" stroke-width="10"/>` +
    `<path d="M ${n(br - 30)} ${n(bb - 96)} L ${W - 40} ${n(bb - 40)} L ${W - 260} ${H} L ${n(br - 260)} ${H} Z" fill="url(#lightpool)" filter="url(#soft)"/>`;

  // Curtains.
  body +=
    `<path d="M ${n(br - 8)} ${n(bt + 40)} L ${n(br + 60)} ${n(bt + 34)} L ${n(br + 60)} ${n(bb - 30)} L ${n(br - 8)} ${n(bb - 60)} Z" fill="${accent}" opacity="0.9"/>` +
    `<path d="M ${W - 120} ${n(bt + 4)} L ${W - 40} ${n(bt - 6)} L ${W - 40} ${n(bb)} L ${W - 120} ${n(bb - 24)} Z" fill="${accent}" opacity="0.75"/>`;

  // Bed against the back wall, slightly left of the vanishing point.
  const bedX = bl + 40;
  const bedTop = bb - 150;
  body +=
    `<rect x="${n(bedX - 10)}" y="${n(bedTop - 210)}" width="440" height="220" rx="14" fill="${accent}"/>` +
    `<rect x="${n(bedX - 10)}" y="${n(bedTop - 210)}" width="440" height="220" rx="14" fill="#000000" opacity="0.1"/>` +
    // Mattress as a trapezoid so it recedes with the room.
    `<path d="M ${n(bedX - 30)} ${n(bedTop)} L ${n(bedX + 450)} ${n(bedTop)} L ${n(bedX + 500)} ${n(bedTop + 190)} L ${n(
      bedX - 80
    )} ${n(bedTop + 190)} Z" fill="#FCFAF6"/>` +
    `<path d="M ${n(bedX - 30)} ${n(bedTop)} L ${n(bedX + 450)} ${n(bedTop)} L ${n(bedX + 462)} ${n(bedTop + 46)} L ${n(
      bedX - 42
    )} ${n(bedTop + 46)} Z" fill="#FFFFFF"/>` +
    `<path d="M ${n(bedX - 56)} ${n(bedTop + 108)} L ${n(bedX + 476)} ${n(bedTop + 108)} L ${n(bedX + 492)} ${n(
      bedTop + 168
    )} L ${n(bedX - 72)} ${n(bedTop + 168)} Z" fill="${mix(accent, "#FFFFFF", 0.62)}"/>` +
    `<rect x="${n(bedX + 20)}" y="${n(bedTop - 74)}" width="180" height="66" rx="16" fill="#FFFFFF"/>` +
    `<rect x="${n(bedX + 216)}" y="${n(bedTop - 74)}" width="180" height="66" rx="16" fill="#FFFFFF"/>` +
    `<ellipse cx="${n(bedX + 210)}" cy="${n(bedTop + 196)}" rx="300" ry="16" fill="#000000" opacity="0.18"/>`;

  // Bedside table and lamp — the second, warmer light source.
  const tx = bedX + 470;
  body +=
    `<rect x="${n(tx)}" y="${n(bedTop + 40)}" width="110" height="120" rx="5" fill="${mix(floor, "#FFFFFF", 0.2)}"/>` +
    `<rect x="${n(tx + 50)}" y="${n(bedTop - 34)}" width="8" height="76" fill="#2B2B2B"/>` +
    `<path d="M ${n(tx + 20)} ${n(bedTop - 32)} L ${n(tx + 88)} ${n(bedTop - 32)} L ${n(tx + 74)} ${n(bedTop - 92)} L ${n(
      tx + 34
    )} ${n(bedTop - 92)} Z" fill="#F7DCA6"/>` +
    `<circle cx="${n(tx + 54)}" cy="${n(bedTop - 40)}" r="90" fill="#FFE3A5" opacity="0.26" filter="url(#bloom)"/>`;

  // Art on the back wall and a plant in the corner.
  body +=
    `<rect x="${n(bl + 60)}" y="${n(bt + 70)}" width="170" height="120" rx="3" fill="${mix(accent, "#FFFFFF", 0.42)}"/>` +
    `<rect x="${n(bl + 60)}" y="${n(bt + 70)}" width="170" height="120" rx="3" fill="none" stroke="${mix(wall, "#000000", 0.35)}" stroke-width="7"/>` +
    `<g transform="translate(${n(bl - 60)} ${n(bb + 60)})">` +
    `<path d="M -40 0 L 40 0 L 30 -80 L -30 -80 Z" fill="#A75A3E"/>` +
    `<path d="M 0 -80 Q -84 -140 -56 -226 Q -8 -170 0 -80 Z" fill="#2F6B4F"/>` +
    `<path d="M 0 -80 Q 88 -134 66 -232 Q 10 -172 0 -80 Z" fill="#3E8A63"/>` +
    `<path d="M 0 -80 Q -20 -160 6 -240" fill="none" stroke="#2F6B4F" stroke-width="8" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="6" rx="60" ry="10" fill="#000000" opacity="0.2"/>` +
    `</g>`;

  return wrap(defs, body);
}

/** Car in side profile, with body-panel highlights and a ground reflection. */
function sceneCar(rand, colour, mood = "day") {
  const s = sky("sk", mood);
  const horizon = H * 0.52;
  const road = "#3E4048";
  const sunX = between(rand, W * 0.15, W * 0.4);

  const defs =
    lg("body", [
      [0, mix(colour, "#FFFFFF", 0.42)],
      [0.42, colour],
      [1, mix(colour, "#000000", 0.42)]
    ]) +
    lg("glass", [
      [0, "#D9EAF5"],
      [1, "#7FA4C0"]
    ]) +
    lg("roadg", [
      [0, mix(road, "#FFFFFF", 0.14)],
      [1, mix(road, "#000000", 0.35)]
    ]);

  let body =
    s.body +
    keyLight(rand, sunX, horizon - 260, mood, { shafts: false }) +
    cloudBank(rand, horizon - 250, s.at(0.7), 5, 0.4) +
    ridges(rand, {
      baseY: horizon,
      layers: 3,
      landColor: "#3F6552",
      hazeColor: s.horizonColor,
      drop: 60,
      amp: 130
    }) +
    horizonHaze(horizon, s.at(0.94)) +
    `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${mix("#8B9E74", s.horizonColor, 0.25)}"/>` +
    `<path d="M -40 ${n(horizon + 120)} Q ${W / 2} ${n(horizon + 80)} ${W + 40} ${n(horizon + 130)} L ${W + 40} ${H} L -40 ${H} Z" fill="url(#roadg)"/>` +
    `<path d="M -40 ${n(horizon + 120)} Q ${W / 2} ${n(horizon + 80)} ${W + 40} ${n(horizon + 130)}" fill="none" stroke="#EFE7D2" stroke-width="5" opacity="0.55"/>`;

  for (let i = 0; i < 10; i++) {
    body += `<rect x="${n(i * 175 + 20)}" y="${n(horizon + 250)}" width="96" height="9" rx="4" fill="#F3E9C6" opacity="0.75"/>`;
  }

  const cx = W * 0.52;
  const cy = horizon + 210;
  body +=
    `<g transform="translate(${n(cx)} ${n(cy)})">` +
    `<ellipse cx="0" cy="104" rx="360" ry="22" fill="#000000" opacity="0.3" filter="url(#soft)"/>` +
    // Body: a single silhouette, then a highlight sweep along the shoulder line.
    `<path d="M -336 46 L -320 -22 Q -304 -56 -252 -64 L -128 -74 Q -70 -128 32 -130 L 128 -128 Q 218 -120 258 -66 L 306 -52 Q 340 -40 342 4 L 342 50 Q 342 72 318 72 L -314 72 Q -336 72 -336 46 Z" fill="url(#body)"/>` +
    `<path d="M -320 6 Q 0 -22 340 4 L 340 20 Q 0 -6 -320 22 Z" fill="#FFFFFF" opacity="0.22"/>` +
    `<path d="M -124 -76 Q -68 -122 24 -124 L 24 -72 Z" fill="url(#glass)"/>` +
    `<path d="M 44 -124 L 122 -122 Q 202 -116 240 -70 L 44 -72 Z" fill="url(#glass)"/>` +
    `<path d="M -124 -76 Q -68 -122 24 -124 L 24 -110 Q -60 -108 -110 -70 Z" fill="#FFFFFF" opacity="0.35"/>` +
    `<rect x="-336" y="24" width="678" height="12" fill="#000000" opacity="0.22"/>` +
    // Wheels with an arch shadow and a simple alloy.
    `<path d="M -262 46 a 72 72 0 0 1 144 0 Z" fill="#000000" opacity="0.35"/>` +
    `<circle cx="-190" cy="60" r="72" fill="#16181D"/><circle cx="-190" cy="60" r="40" fill="#C7CCD4"/><circle cx="-190" cy="60" r="14" fill="#8B929C"/>` +
    `<path d="M 128 46 a 72 72 0 0 1 144 0 Z" fill="#000000" opacity="0.35"/>` +
    `<circle cx="200" cy="60" r="72" fill="#16181D"/><circle cx="200" cy="60" r="40" fill="#C7CCD4"/><circle cx="200" cy="60" r="14" fill="#8B929C"/>` +
    `<rect x="312" y="-32" width="34" height="22" rx="10" fill="#FFF2C4"/>` +
    `<circle cx="330" cy="-22" r="46" fill="#FFF2C4" opacity="0.32" filter="url(#bloom)"/>` +
    `<rect x="-340" y="-18" width="26" height="18" rx="8" fill="#FF6F63"/>` +
    `</g>`;
  return wrap(s.defs + defs, body);
}

function sceneBus(rand, colour) {
  const s = sky("sk", "day");
  const horizon = H * 0.48;
  const road = "#3E4048";
  const defs =
    lg("busbody", [
      [0, mix(colour, "#FFFFFF", 0.34)],
      [0.5, colour],
      [1, mix(colour, "#000000", 0.4)]
    ]) +
    lg("glass2", [
      [0, "#DCEBF6"],
      [1, "#89AAC4"]
    ]) +
    lg("roadg2", [
      [0, mix(road, "#FFFFFF", 0.14)],
      [1, mix(road, "#000000", 0.35)]
    ]);

  let body =
    s.body +
    keyLight(rand, W * 0.3, horizon - 250, "day", { shafts: false }) +
    cloudBank(rand, horizon - 230, s.at(0.7), 6, 0.42) +
    ridges(rand, {
      baseY: horizon,
      layers: 3,
      landColor: "#42684F",
      hazeColor: s.horizonColor,
      drop: 60,
      amp: 140
    }) +
    horizonHaze(horizon, s.at(0.94)) +
    `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${mix("#8FA57C", s.horizonColor, 0.25)}"/>` +
    `<path d="M -40 ${n(horizon + 150)} Q ${W / 2} ${n(horizon + 110)} ${W + 40} ${n(horizon + 160)} L ${W + 40} ${H} L -40 ${H} Z" fill="url(#roadg2)"/>`;
  for (let i = 0; i < 10; i++) {
    body += `<rect x="${n(i * 175 + 40)}" y="${n(horizon + 300)}" width="96" height="9" rx="4" fill="#F3E9C6" opacity="0.75"/>`;
  }

  const bx = W * 0.5;
  const by = horizon + 250;
  body +=
    `<g transform="translate(${n(bx)} ${n(by)})">` +
    `<ellipse cx="0" cy="122" rx="400" ry="22" fill="#000000" opacity="0.3" filter="url(#soft)"/>` +
    `<rect x="-390" y="-190" width="780" height="290" rx="30" fill="url(#busbody)"/>` +
    `<rect x="-390" y="-60" width="780" height="30" fill="#FFFFFF" opacity="0.18"/>` +
    `<rect x="-390" y="-30" width="780" height="26" fill="#000000" opacity="0.2"/>` +
    `<path d="M 296 -190 L 390 -190 Q 390 -178 390 -160 L 390 -60 L 280 -60 Z" fill="url(#glass2)"/>`;
  for (let i = 0; i < 7; i++) {
    body += `<rect x="${n(-362 + i * 92)}" y="-160" width="74" height="80" rx="8" fill="url(#glass2)"/>`;
    body += `<rect x="${n(-362 + i * 92)}" y="-160" width="74" height="22" rx="8" fill="#FFFFFF" opacity="0.3"/>`;
  }
  body +=
    `<path d="M -300 88 a 62 62 0 0 1 124 0 Z" fill="#000000" opacity="0.35"/>` +
    `<circle cx="-238" cy="96" r="62" fill="#16181D"/><circle cx="-238" cy="96" r="32" fill="#C7CCD4"/>` +
    `<path d="M 174 88 a 62 62 0 0 1 124 0 Z" fill="#000000" opacity="0.35"/>` +
    `<circle cx="236" cy="96" r="62" fill="#16181D"/><circle cx="236" cy="96" r="32" fill="#C7CCD4"/>` +
    `<rect x="356" y="18" width="34" height="22" rx="9" fill="#FFF2C4"/>` +
    `</g>`;
  return wrap(s.defs + defs, body);
}

function scenePlane(rand, mood) {
  const s = sky("sk", mood);
  const sunX = between(rand, W * 0.6, W * 0.85);
  const defs =
    lg("fuse", [
      [0, "#FFFFFF"],
      [0.55, "#EDF1F6"],
      [1, "#B9C4D2"]
    ]) +
    lg("deck", [
      [0, "#FFFFFF", 0.95],
      [1, "#FFFFFF", 0.45]
    ]);

  let body = s.body + keyLight(rand, sunX, H * 0.3, mood);

  // Cloud deck below the aircraft, three receding layers.
  for (let i = 0; i < 3; i++) {
    const y = H * 0.62 + i * 110;
    const pts = [];
    for (let k = 0; k <= 7; k++) {
      pts.push([-100 + (k * (W + 200)) / 7, y + between(rand, -70, 70)]);
    }
    body += `<path d="${spline(pts)} L ${W + 100} ${H + 40} L -100 ${H + 40} Z" fill="${mix(
      "#FFFFFF",
      s.at(0.8),
      i * 0.28
    )}" opacity="${n(0.9 - i * 0.2)}" filter="${i === 0 ? "url(#soft)" : "none"}"/>`;
  }
  body += cloudBank(rand, H * 0.42, "#FFFFFF", 5, 0.4);

  const px = W * 0.44;
  const py = H * 0.42;
  body +=
    `<g transform="translate(${n(px)} ${n(py)}) rotate(-7)">` +
    `<path d="M -60 10 L -230 176 L -150 176 L 40 22 Z" fill="#9FB0C4"/>` +
    `<path d="M -350 0 Q -310 -38 -186 -40 L 262 -38 Q 340 -32 372 0 Q 340 32 262 38 L -186 40 Q -310 38 -350 0 Z" fill="url(#fuse)"/>` +
    `<path d="M -350 0 Q -310 -38 -186 -40 L 262 -38 Q 340 -32 372 0 Z" fill="#FFFFFF"/>` +
    `<path d="M -50 -8 L -178 -172 L -100 -172 L 58 -10 Z" fill="#D9E2ED"/>` +
    `<path d="M -300 -6 L -366 -118 L -318 -118 L -246 -8 Z" fill="#D9E2ED"/>` +
    `<rect x="-320" y="-6" width="676" height="14" rx="7" fill="#123A5F" opacity="0.9"/>` +
    `<rect x="-320" y="10" width="676" height="6" rx="3" fill="#F5A623" opacity="0.9"/>`;
  for (let i = 0; i < 20; i++) {
    body += `<circle cx="${n(-268 + i * 28)}" cy="-15" r="4.5" fill="#8FA0B6"/>`;
  }
  body +=
    `<path d="M 318 -26 Q 372 -14 372 0 L 318 0 Z" fill="#0E2A4A"/>` +
    `<ellipse cx="-96" cy="60" rx="54" ry="26" fill="#5D6B7D"/>` +
    `</g>`;
  body += birds(rand, 3, H * 0.28);
  return wrap(s.defs + defs, body);
}

function sceneHouse(rand, wallCol, roofCol) {
  const s = sky("sk", "day");
  const horizon = H * 0.6;
  const defs =
    lg("wallg", [
      [0, mix(wallCol, "#FFFFFF", 0.2)],
      [1, mix(wallCol, "#000000", 0.16)]
    ]) +
    lg("winw", [
      [0, "#CFE7F5"],
      [1, "#7FA9C6"]
    ]) +
    lg("lawn", [
      [0, mix("#6F9455", s.horizonColor, 0.3)],
      [1, "#3F6136"]
    ]);

  let body =
    s.body +
    keyLight(rand, W * 0.24, H * 0.16, "day", { shafts: false }) +
    cloudBank(rand, H * 0.2, "#FFFFFF", 6, 0.45) +
    ridges(rand, {
      baseY: horizon - 10,
      layers: 2,
      landColor: "#4C7355",
      hazeColor: s.horizonColor,
      drop: 40,
      amp: 90
    }) +
    horizonHaze(horizon, s.at(0.94)) +
    `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="url(#lawn)"/>`;

  const hx = 300;
  const hy = horizon - 250;
  const hw = 820;
  body +=
    `<ellipse cx="${n(hx + hw / 2)}" cy="${n(horizon + 14)}" rx="${n(hw * 0.62)}" ry="26" fill="#000000" opacity="0.22" filter="url(#soft)"/>` +
    `<rect x="${hx}" y="${n(hy)}" width="${hw}" height="252" fill="url(#wallg)"/>` +
    // Hipped roof with a shaded plane, so it is not a flat triangle.
    `<path d="M ${hx - 60} ${n(hy)} L ${n(hx + hw / 2)} ${n(hy - 180)} L ${n(hx + hw + 60)} ${n(hy)} Z" fill="${roofCol}"/>` +
    `<path d="M ${n(hx + hw / 2)} ${n(hy - 180)} L ${n(hx + hw + 60)} ${n(hy)} L ${n(hx + hw / 2)} ${n(hy)} Z" fill="#000000" opacity="0.18"/>` +
    `<rect x="${hx - 60}" y="${n(hy - 6)}" width="${hw + 120}" height="16" rx="4" fill="${mix(roofCol, "#000000", 0.3)}"/>`;

  for (const wx of [hx + 70, hx + 220, hx + 520, hx + 670]) {
    body +=
      `<rect x="${wx}" y="${n(hy + 70)}" width="106" height="96" rx="3" fill="url(#winw)"/>` +
      `<rect x="${wx}" y="${n(hy + 70)}" width="106" height="96" rx="3" fill="none" stroke="#FFFFFF" stroke-width="9"/>` +
      `<rect x="${wx + 49}" y="${n(hy + 70)}" width="8" height="96" fill="#FFFFFF"/>` +
      `<path d="M ${wx} ${n(hy + 70)} L ${wx + 106} ${n(hy + 70)} L ${wx + 46} ${n(hy + 166)} L ${wx} ${n(hy + 166)} Z" fill="#FFFFFF" opacity="0.22"/>`;
  }
  body +=
    `<rect x="${hx + 360}" y="${n(hy + 96)}" width="110" height="156" rx="4" fill="#5A3A22"/>` +
    `<rect x="${hx + 372}" y="${n(hy + 108)}" width="86" height="90" rx="3" fill="url(#winw)" opacity="0.8"/>` +
    `<circle cx="${hx + 452}" cy="${n(hy + 182)}" r="6" fill="#E8C46A"/>` +
    `<path d="M ${hx + 330} ${n(horizon)} L ${hx + 500} ${n(horizon)} L ${hx + 600} ${H} L ${hx + 230} ${H} Z" fill="${mix(
      "#D9CFBC",
      s.horizonColor,
      0.15
    )}"/>`;

  body += palm(rand, 160, horizon + 130, 1.1, "#254E3A");
  body += palm(rand, W - 130, horizon + 180, 1.25, "#254E3A");
  body +=
    `<g transform="translate(${W - 420} ${n(horizon + 90)})">` +
    `<ellipse cx="0" cy="6" rx="90" ry="16" fill="#000000" opacity="0.18"/>` +
    `<path d="M0 0 L0 -90" stroke="#5A3A22" stroke-width="14" stroke-linecap="round"/>` +
    `<circle cx="0" cy="-124" r="64" fill="#3E8A63"/>` +
    `<circle cx="-36" cy="-100" r="44" fill="#2F6B4F"/>` +
    `<circle cx="38" cy="-104" r="46" fill="#4C9C72"/>` +
    `</g>`;
  return wrap(s.defs + defs, body);
}

function sceneApartment(rand, wallCol) {
  const s = sky("sk", "day");
  const horizon = H * 0.78;
  const defs =
    lg("aw", [
      [0, mix(wallCol, "#FFFFFF", 0.22)],
      [1, mix(wallCol, "#000000", 0.2)]
    ]) +
    lg("ag", [
      [0, "#2E6F9C"],
      [1, "#123A5F"]
    ]);

  let body =
    s.body +
    keyLight(rand, W * 0.18, H * 0.14, "day", { shafts: false }) +
    cloudBank(rand, H * 0.22, "#FFFFFF", 5, 0.45) +
    `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${mix("#9AA3A8", s.horizonColor, 0.2)}"/>` +
    `<rect x="0" y="${n(horizon)}" width="${W}" height="7" fill="#79838A"/>`;

  const bx = 240;
  const bw = 1120;
  const by = 110;
  body +=
    `<ellipse cx="${n(bx + bw / 2)}" cy="${n(horizon + 12)}" rx="${n(bw * 0.55)}" ry="22" fill="#000000" opacity="0.22" filter="url(#soft)"/>` +
    `<rect x="${bx}" y="${by}" width="${bw}" height="${n(horizon - by)}" fill="url(#aw)"/>` +
    `<rect x="${bx}" y="${by}" width="26" height="${n(horizon - by)}" fill="#FFFFFF" opacity="0.28"/>` +
    `<rect x="${bx}" y="${by - 20}" width="${bw}" height="26" rx="4" fill="${mix(wallCol, "#000000", 0.32)}"/>`;

  for (let f = 0; f < 6; f++) {
    const fy = by + 54 + f * 108;
    body += `<rect x="${bx}" y="${n(fy + 74)}" width="${bw}" height="12" fill="${mix(wallCol, "#000000", 0.22)}"/>`;
    body += `<rect x="${bx}" y="${n(fy + 86)}" width="${bw}" height="14" fill="#000000" opacity="0.1"/>`;
    for (let c = 0; c < 8; c++) {
      const wx = bx + 46 + c * 134;
      body +=
        `<rect x="${n(wx)}" y="${n(fy)}" width="92" height="74" rx="3" fill="url(#ag)" opacity="${n(between(rand, 0.6, 0.95))}"/>` +
        `<path d="M ${n(wx)} ${n(fy)} L ${n(wx + 92)} ${n(fy)} L ${n(wx + 40)} ${n(fy + 74)} L ${n(wx)} ${n(fy + 74)} Z" fill="#FFFFFF" opacity="0.16"/>` +
        `<rect x="${n(wx - 10)}" y="${n(fy + 66)}" width="112" height="9" rx="4" fill="${mix(wallCol, "#000000", 0.34)}"/>`;
      if (rand() > 0.62) {
        body += `<circle cx="${n(wx + 20)}" cy="${n(fy + 52)}" r="14" fill="#3E8A63" opacity="0.85"/>`;
      }
    }
  }
  body +=
    `<rect x="${n(bx + bw / 2 - 90)}" y="${n(horizon - 150)}" width="180" height="150" rx="6" fill="#4A3324"/>` +
    `<rect x="${n(bx + bw / 2 - 76)}" y="${n(horizon - 136)}" width="152" height="136" rx="4" fill="url(#ag)" opacity="0.7"/>` +
    `<rect x="${n(bx + bw / 2 - 110)}" y="${n(horizon - 172)}" width="220" height="22" rx="6" fill="${mix(wallCol, "#000000", 0.36)}"/>`;

  body += palm(rand, 140, horizon + 20, 1.15, "#245040");
  body += palm(rand, W - 120, horizon + 40, 1.05, "#245040");
  return wrap(s.defs + defs, body);
}

function sceneLand(rand) {
  const s = sky("sk", "day");
  const horizon = H * 0.45;
  const ground = "#B9A472";
  let body =
    s.body +
    keyLight(rand, W * 0.7, H * 0.16, "day", { shafts: false }) +
    cloudBank(rand, H * 0.22, "#FFFFFF", 6, 0.45) +
    ridges(rand, {
      baseY: horizon,
      layers: 3,
      landColor: "#6E8A5E",
      hazeColor: s.horizonColor,
      drop: 50,
      amp: 110
    }) +
    horizonHaze(horizon, s.at(0.94));

  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const y = horizon + t * (H - horizon) * 0.8;
    const pts = [];
    for (let k = 0; k <= 6; k++) pts.push([-80 + (k * (W + 160)) / 6, y + between(rand, -20, 20)]);
    body += `<path d="${spline(pts)} L ${W + 80} ${H} L -80 ${H} Z" fill="${mix(
      mix(ground, s.horizonColor, (1 - t) * 0.45),
      "#2A2010",
      t * 0.4
    )}"/>`;
  }

  const corners = [
    [420, horizon + 160],
    [1180, horizon + 160],
    [1480, H - 60],
    [120, H - 60]
  ];
  body +=
    `<path d="M ${corners.map((c) => `${n(c[0])} ${n(c[1])}`).join(" L ")} Z" fill="#FFFFFF" opacity="0.1"/>` +
    `<path d="M ${corners.map((c) => `${n(c[0])} ${n(c[1])}`).join(" L ")} Z" fill="none" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="6" stroke-dasharray="30 22"/>`;
  for (const [px, py] of corners) {
    body +=
      `<ellipse cx="${n(px)}" cy="${n(py + 6)}" rx="26" ry="7" fill="#000000" opacity="0.25"/>` +
      `<rect x="${n(px - 7)}" y="${n(py - 92)}" width="15" height="92" rx="4" fill="#6B4A2E"/>` +
      `<circle cx="${n(px)}" cy="${n(py - 102)}" r="14" fill="#F5A623"/>` +
      `<circle cx="${n(px)}" cy="${n(py - 102)}" r="34" fill="#F5A623" opacity="0.3" filter="url(#bloom)"/>`;
  }
  body += acacia(rand, 1420, horizon + 110, 0.6, mix("#4E6B48", s.horizonColor, 0.2));
  body += acacia(rand, 210, horizon + 96, 0.48, mix("#4E6B48", s.horizonColor, 0.3));
  return wrap(s.defs, body);
}

function sceneMarket(rand) {
  const s = sky("sk", "dusk");
  const horizon = H * 0.6;
  let body =
    s.body +
    keyLight(rand, W * 0.72, horizon - 180, "dusk") +
    cloudBank(rand, horizon - 260, s.at(0.72), 5, 0.4) +
    skyline(rand, horizon - 20, "#2C3A51", s.horizonColor, 0.55) +
    horizonHaze(horizon, s.at(0.92)) +
    `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${mix("#A99A84", s.horizonColor, 0.25)}"/>`;

  const canopies = ["#D2492F", "#E8A33D", "#357A5B", "#1E5A8E", "#B33B63"];
  for (let i = 0; i < 6; i++) {
    const sx = 40 + i * 270;
    const col = canopies[i % canopies.length];
    const depth = i / 6;
    const tone = mix(col, s.horizonColor, depth * 0.25);
    body +=
      `<g transform="translate(${sx} ${n(horizon + 40)})">` +
      `<ellipse cx="110" cy="8" rx="140" ry="16" fill="#000000" opacity="0.22" filter="url(#soft)"/>` +
      `<rect x="6" y="-150" width="10" height="150" fill="#5C4326"/>` +
      `<rect x="206" y="-150" width="10" height="150" fill="#5C4326"/>` +
      `<path d="M -16 -150 L 238 -150 L 214 -196 L 8 -196 Z" fill="${tone}"/>` +
      `<path d="M -16 -150 L 238 -150 L 226 -128 L -4 -128 Z" fill="${mix(tone, "#000000", 0.3)}"/>` +
      `<path d="M -12 -96 L 234 -96 L 222 -30 L 0 -30 Z" fill="${mix("#EBDFC9", s.horizonColor, 0.2)}"/>`;
    for (let b = 0; b < 6; b++) {
      body += `<circle cx="${n(24 + b * 38)}" cy="-60" r="16" fill="${pick(rand, [
        "#E8C46A",
        "#D9452F",
        "#5FA855",
        "#E07A2F",
        "#8E4B7C"
      ])}"/>`;
    }
    body += `<circle cx="110" cy="-166" r="60" fill="#FFE1A0" opacity="0.22" filter="url(#bloom)"/>`;
    body += `</g>`;
  }
  body += `<rect x="0" y="${H - 110}" width="${W}" height="110" fill="#8E8271" opacity="0.9"/>`;
  return wrap(s.defs, body);
}

/** Abstract brand banner for auth, legal and CMS pages. */
function sceneBanner(rand, variant = 0) {
  const defs =
    lg("bg", [
      [0, "#050D1A"],
      [0.45, "#0A2540"],
      [1, "#123A5F"]
    ], 0, 0, 1, 1) +
    rg("blobA", [
      [0, "#F5A623", 0.6],
      [1, "#F5A623", 0]
    ]) +
    rg("blobB", [
      [0, "#3F7FB0", 0.55],
      [1, "#3F7FB0", 0]
    ]);

  let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  for (let i = 0; i < 5; i++) {
    body += `<circle cx="${n(between(rand, 0, W))}" cy="${n(between(rand, 0, H))}" r="${n(
      between(rand, 220, 460)
    )}" fill="url(#${i % 2 === 0 ? "blobA" : "blobB"})" opacity="0.55"/>`;
  }
  // Contour lines — the map-like texture that reads as travel without a cliché.
  for (let i = 0; i < 9; i++) {
    const pts = [];
    const baseY = between(rand, 100, H - 100);
    for (let k = 0; k <= 9; k++) {
      pts.push([-80 + (k * (W + 160)) / 9, baseY + Math.sin(k * 0.8 + i) * between(rand, 20, 70)]);
    }
    body += `<path d="${spline(pts)}" fill="none" stroke="#FFFFFF" stroke-opacity="${n(
      between(rand, 0.04, 0.11)
    )}" stroke-width="1.6"/>`;
  }
  for (let i = 0; i < 40; i++) {
    body += `<circle cx="${n(between(rand, 0, W))}" cy="${n(between(rand, 0, H))}" r="${n(
      between(rand, 1, 3)
    )}" fill="#FFFFFF" opacity="${n(between(rand, 0.12, 0.45))}"/>`;
  }
  if (variant === 1) {
    body += `<path d="M -60 ${H * 0.72} Q ${W * 0.3} ${H * 0.58} ${W * 0.6} ${H * 0.7} Q ${W * 0.85} ${
      H * 0.79
    } ${W + 60} ${H * 0.64} L ${W + 60} ${H} L -60 ${H} Z" fill="#FFFFFF" opacity="0.05"/>`;
  }
  return wrap(defs, body);
}

/* ------------------------------------------------------------------ catalog */

const FILES = {
  "hero-kinshasa": (r) => sceneCity(r, "dusk"),
  "hero-river": (r) => sceneRiver(r, "dawn"),
  "dest-kinshasa": (r) => sceneCity(r, "blueHour"),
  "dest-lubumbashi": (r) => sceneCity(r, "dusk"),
  "dest-goma": (r) => sceneLandscape(r, "dawn", "#3E5F52"),
  "dest-bukavu": (r) => sceneLandscape(r, "tropic", "#2F5F55"),
  "dest-matadi": (r) => sceneRiver(r, "day"),
  "dest-kisangani": (r) => sceneRiver(r, "dusk"),
  "dest-mbuji-mayi": (r) => sceneSavanna(r, "day"),
  "dest-kananga": (r) => sceneMarket(r),

  "hotel-1": (r) => sceneResort(r, "day"),
  "hotel-2": (r) => sceneResort(r, "dusk"),
  "hotel-3": (r) => sceneApartment(r, "#EFE5D2"),
  "hotel-4": (r) => sceneResort(r, "tropic"),
  "hotel-5": (r) => sceneApartment(r, "#E2E8EC"),
  "hotel-6": (r) => sceneResort(r, "dawn"),
  "room-1": (r) => sceneRoom(r),
  "room-2": (r) => sceneRoom(r),
  "room-3": (r) => sceneRoom(r),
  "room-4": (r) => sceneRoom(r),
  "room-5": (r) => sceneRoom(r),
  "room-6": (r) => sceneRoom(r),

  "flight-1": (r) => scenePlane(r, "day"),
  "flight-2": (r) => scenePlane(r, "dusk"),
  "flight-3": (r) => scenePlane(r, "dawn"),

  "bus-1": (r) => sceneBus(r, "#1E5A8E"),
  "bus-2": (r) => sceneBus(r, "#D2492F"),
  "bus-3": (r) => sceneBus(r, "#2F6B4F"),

  "car-1": (r) => sceneCar(r, "#123A5F"),
  "car-2": (r) => sceneCar(r, "#C7CCD4", "dawn"),
  "car-3": (r) => sceneCar(r, "#22242A", "dusk"),
  "car-4": (r) => sceneCar(r, "#8C3F2C"),
  "car-5": (r) => sceneCar(r, "#2F6B4F", "tropic"),

  "activity-1": (r) => sceneSavanna(r, "dawn"),
  "activity-2": (r) => sceneLandscape(r, "tropic", "#2F5F55"),
  "activity-3": (r) => sceneRiver(r, "day"),
  "activity-4": (r) => sceneMarket(r),
  "activity-5": (r) => sceneLandscape(r, "dusk", "#4A3F33"),
  "activity-6": (r) => sceneSavanna(r, "dusk"),

  "property-1": (r) => sceneHouse(r, "#F6F1E6", "#8C4A3C"),
  "property-2": (r) => sceneHouse(r, "#EFE5D4", "#39566B"),
  "property-3": (r) => sceneApartment(r, "#F2ECE1"),
  "property-4": (r) => sceneApartment(r, "#DCE4EE"),
  "property-5": (r) => sceneLand(r),
  "property-6": (r) => sceneLand(r),
  "property-7": (r) => sceneHouse(r, "#E8EDF0", "#6B4A2E"),
  "property-8": (r) => sceneApartment(r, "#EEE3D0"),

  "banner-1": (r) => sceneBanner(r, 0),
  "banner-2": (r) => sceneBanner(r, 1)
};

mkdirSync(OUT, { recursive: true });
let count = 0;
for (const [name, build] of Object.entries(FILES)) {
  writeFileSync(join(OUT, `${name}.svg`), build(rng(hash(name))));
  count++;
}

// Brand mark: a compass rose, used for the logo and the favicon.
writeFileSync(
  join(OUT, "logo-mark.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img">
  <defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#123A5F"/><stop offset="1" stop-color="#0A2540"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="16" fill="url(#m)"/>
  <path d="M32 9 L37.5 26.5 L55 32 L37.5 37.5 L32 55 L26.5 37.5 L9 32 L26.5 26.5 Z" fill="#F5A623"/>
  <path d="M32 9 L37.5 26.5 L32 32 Z" fill="#FFC862"/>
  <circle cx="32" cy="32" r="4" fill="#0A2540"/>
</svg>`
);
console.log(`wrote ${count + 1} svg files to public/img`);
