/**
 * Downloads the editorial photography for the two curated homepage rails and
 * writes it into `public/img/photos` as WebP.
 *
 * The point is that nothing here is fetched at runtime: the site ships the
 * bytes. Re-run this only when a pick changes — the output is committed.
 *
 *   node scripts/fetch-photos.mjs
 *
 * Every id below was chosen by eye from a contact sheet, not by trusting a
 * search ranking. They are representative stock photographs, *not* photographs
 * of the DRC city each one labels — see the note in README.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/** 4:5, matching `aspect-4/5` on both `DestinationTile` and the inspiration card. */
const WIDTH = 720;
const HEIGHT = 900;
const OUT = join(process.cwd(), "public", "img", "photos");

/**
 * slug → [unsplash photo id, what it actually depicts, crop override].
 *
 * The default crop is `attention`, which finds the subject. Override it when
 * the subject *is* the composition — `road-n1` is a road running to the
 * horizon, and attention happily crops to the cattle beside it instead.
 */
const PHOTOS = {
  // "Ideas worth travelling for"
  "gorillas-kahuzi-biega": ["1581281863883-2469417a1668", "Lowland gorilla in forest undergrowth"],
  "nyiragongo": ["1580250642511-1660fe42ad58", "Stratovolcano erupting at dusk"],
  "congo-sunset": ["1761342615545-cc970eea273d", "Motorboat on a wide tropical river"],
  "lubumbashi-business": ["1761377197584-2eed555e2b0c", "Traveller with luggage in a hotel lobby"],
  "road-n1": ["1759129669520-b285523c4901", "Truck on a road through bush country", "centre"],
  "gombe-property": ["1706164971299-cfa23ec76083", "Modern villa with pool and palms"],

  // Popular destinations — keyed by `CITIES[].slug`
  "kinshasa": ["1575180934614-09e879d021dd", "Dense downtown aerial with expressway"],
  "lubumbashi": ["1741991110666-88115e724741", "City towers among green"],
  "goma": ["1609848997238-464b7e28e17d", "Deep-blue lake seen from a ridge"],
  "bukavu": ["1706977570024-fefa419c48c8", "Lakeside road and wooded island"],
  "matadi": ["1606185540834-d6e7483ee1a4", "River port aerial with berthed ships"],
  "kisangani": ["1761998849593-e954aa29e1c1", "Forest river with village on the bank"],
  "mbuji-mayi": ["1645792298509-7aadfa5b6f49", "Low-rise city sprawl from the air"],
  "kananga": ["1693902997450-7e912c0d3554", "Town of red-tiled roofs below a ridge"]
};

await mkdir(OUT, { recursive: true });

const manifest = {};
for (const [slug, [id, subject, crop]] of Object.entries(PHOTOS)) {
  // w=1600 so the 4:5 crop still has pixels to spare on a 2x screen.
  const source = `https://images.unsplash.com/photo-${id}?w=1600&q=80&fm=jpg`;
  const res = await fetch(source);
  if (!res.ok) throw new Error(`${slug}: ${source} -> ${res.status}`);

  const info = await sharp(Buffer.from(await res.arrayBuffer()))
    // `attention` keeps the subject in frame; a centre crop decapitates the
    // gorilla and throws away half of every skyline.
    .resize(WIDTH, HEIGHT, { fit: "cover", position: crop ?? sharp.strategy.attention })
    .webp({ quality: 78, effort: 6 })
    .toFile(join(OUT, `${slug}.webp`));

  manifest[slug] = { subject, source, page: `https://unsplash.com/photos/${id}` };
  console.log(`${slug.padEnd(22)} ${String(Math.round(info.size / 1024)).padStart(4)} KB  ${subject}`);
}

await writeFile(join(OUT, "credits.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${Object.keys(manifest).length} photos -> public/img/photos`);
