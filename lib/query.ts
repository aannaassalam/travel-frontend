import Router, { useRouter } from "next/router";
import { useSyncExternalStore } from "react";

type Query = Record<string, string | string[] | undefined>;

/*
 * Changes to a page's ?query (a filter, the order, the search words), sent one
 * at a time. Two pushes on one page can overlap in Next 15 and land in either
 * order: the second change was lost (a word typed as a cuisine was picked), or
 * both renders clashed and every later push on the page failed.
 */

/** What was asked for and has not landed yet, on the page it was asked on. */
let headed: { path: string; query: Query } | null = null;
let sending = false;
const listeners = new Set<() => void>();
const here = () => Router.asPath.split(/[?#]/)[0];
const flat = (q: Query) => JSON.stringify(Object.entries(q).filter(([, v]) => v).sort());

function head(next: typeof headed) {
  headed = next;
  listeners.forEach((l) => l());
}

/**
 * Navigations on their way: Next ends each start with a complete or an error.
 * While one the visitor made (a card, a page number, the search bar, Back) is
 * loading, ours wait no more — sent, they would cancel it. Counted for 15 s at
 * most, so a lost end can never stop the filters for good.
 */
let moving = 0;
let movedAt = 0;
const visitorMoving = () => moving > 0 && Date.now() - movedAt < 15_000;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => head(null));
  const end = () => void (moving = Math.max(0, moving - 1));
  Router.events.on("routeChangeStart", () => {
    moving++;
    movedAt = Date.now();
  });
  Router.events.on("routeChangeComplete", end);
  Router.events.on("routeChangeError", end);
}

/** The page's query as it will be once what was asked for lands. */
export const queryNow = (): Query => ({
  ...(headed?.path === here()
    ? headed.query
    : // On the address itself: just after a page loads, Next's query is still
      // empty (it says "ready" before it has read the address in).
      { ...Object.fromEntries(new URLSearchParams(location.search)), ...(Router.query as Query) })
});

/** queryNow(), drawn again the moment it moves: a tick shows at once, not when it lands. */
export function useQueryNow(): Query {
  const router = useRouter();
  useSyncExternalStore(subscribe, () => headed, () => null);
  return { ...(headed?.path === router.asPath.split(/[?#]/)[0] ? headed.query : (router.query as Query)) };
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/**
 * Change part of the page's ?query, the rest kept, back to the first page.
 * Empty values go: Next would write `key=`.
 */
export function pushQuery(patch: Query) {
  const query: Query = { ...queryNow(), page: undefined, ...patch };
  for (const k of Object.keys(query)) if (!query[k]) delete query[k];
  head({ path: here(), query });
  if (!sending) void send();
}

async function send() {
  sending = true;
  for (let sent = headed; sent && sent.path === here(); sent = headed) {
    // Our own last push has ended by now: anything still moving is the visitor's.
    if (visitorMoving()) {
      head(null);
      break;
    }
    // Shallow: same page, results from the API — no page data to wait for.
    await Router.push({ pathname: Router.pathname, query: sent.query }, undefined, {
      scroll: false,
      shallow: true
    }).catch(() => false);
    dropCancelled();
    // Somewhere else (Back, a link took over): theirs stands. Else, done unless more came.
    if (flat(Router.query as Query) !== flat(sent.query) || headed === sent) head(null);
  }
  sending = false;
}

/**
 * ponytail: Next 15.3.8 leaves a cancelled render's error on the page's cached
 * route info (router.js:1043) and then fails every later push on that page.
 * Dropped once ours settles; remove when Next stops doing it.
 */
function dropCancelled() {
  const cached = (Router as unknown as { components?: Record<string, { error?: { cancelled?: boolean } }> })
    .components?.[Router.route];
  if (cached?.error?.cancelled) delete cached.error;
}
