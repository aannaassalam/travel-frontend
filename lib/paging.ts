/**
 * Numbered pages on the results pages. No imports, so node can run this file
 * as it is to check it.
 */

/** 30 a page everywhere: ten rows of the three-tile grid. */
export const PAGE_SIZE = 30;

/** `?page=`: a whole page from 1 to the server's 1000; anything else is page 1. */
export function pageParam(raw: unknown): number {
  const n = Math.trunc(Number(Array.isArray(raw) ? raw[0] : raw));
  return n >= 1 ? Math.min(n, 1000) : 1;
}

type Query = Record<string, string | string[] | undefined>;

/**
 * Page `n` of the same search. Page 1 carries no `page`, so it has one address;
 * deleted rather than set to undefined, which Next writes as an empty `page=`.
 */
export function pageHref(pathname: string, query: Query, n: number) {
  const next: Query = { ...query };
  delete next.page;
  if (n > 1) next.page = String(n);
  return { pathname, query: next };
}

/**
 * 1 … 4 5 6 … 12: both ends, the page and its neighbours. A gap of a single
 * page shows that page rather than "…", which would take the same room.
 */
export function pageItems(page: number, pages: number): (number | "gap")[] {
  const keep = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const n of keep) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && n - prev === 2) out.push(prev + 1);
    else if (typeof prev === "number" && n - prev > 2) out.push("gap");
    out.push(n);
  }
  return out;
}
