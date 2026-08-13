import { API_BASE } from "./api";

/**
 * Turns a stored image path into something the browser can actually load.
 *
 * The catalogue stores what the storage adapter returned, which for
 * `STORAGE_DRIVER=local` is a **root-relative** path like
 * `/uploads/hotels/<uuid>.png`. That path is relative to the *API* origin, not
 * to this site — rendering it straight into `<Image src>` makes the browser ask
 * localhost:3000 for a file that only exists on localhost:3001, and every
 * gallery silently 404s.
 *
 * Three cases, in order:
 *   1. Absolute URL or data URI  → already resolvable, pass through. This is
 *      what the S3/Azure driver returns, so switching driver needs no change.
 *   2. Anything under the storage prefix → resolve against the storage origin.
 *   3. Everything else (`/img/...`) → a file in this app's own `public/`.
 */

/** Matches `STORAGE_PUBLIC_URL` on the backend. */
const STORAGE_PREFIX = "/uploads";

/** Origin that serves `/uploads` — the API host unless told otherwise. */
export const STORAGE_ORIGIN = (() => {
  const explicit = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
  if (explicit) return explicit.replace(/\/$/, "");
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "";
  }
})();

/** Shown when a record has no image at all, so a card never renders empty. */
export const IMAGE_FALLBACK = "/img/banner-1.svg";

export function mediaUrl(src: string | undefined | null): string {
  if (!src) return IMAGE_FALLBACK;
  const value = src.trim();
  if (!value) return IMAGE_FALLBACK;

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith(`${STORAGE_PREFIX}/`)) return `${STORAGE_ORIGIN}${value}`;
  return value;
}

/** Map a whole gallery, dropping blanks but never returning an empty array. */
export function mediaUrls(list: (string | undefined | null)[] | undefined): string[] {
  const out = (list ?? []).map(mediaUrl).filter(Boolean);
  return out.length ? out : [IMAGE_FALLBACK];
}
