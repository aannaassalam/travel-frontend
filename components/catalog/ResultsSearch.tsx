import { usePrefs } from "@/lib/prefs";
import { pushQuery, queryNow, useQueryNow } from "@/lib/query";
import { Search, X } from "lucide-react";
import Router from "next/router";
import { useEffect, useRef, useState } from "react";

const word = (q: string | string[] | undefined) => (typeof q === "string" ? q : "");

/**
 * The "search these results" box on every listing page.
 *
 * What is typed goes to the API as `q` — never a client-side filter, the page
 * only ever shows what the server matched. Like every other filter it lives in
 * the URL, so a search can be shared and the back button steps through it.
 * Debounced so typing a word is one request rather than one per letter.
 */
export default function ResultsSearch({ className }: { className?: string }) {
  const { t } = usePrefs();
  // The word the address will say once what was asked for lands.
  const now = useQueryNow();
  const target = word(now.q);
  const [value, setValue] = useState(target);
  // What this box last asked for. When the address comes to say something else
  // — Back, Forward, a link, a change of ours that a link replaced — the box
  // follows; but never over letters still being typed, which are newer.
  const pushed = useRef(target);
  const typing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (typing.current || target === pushed.current) return;
    pushed.current = target;
    setValue(target);
  }, [target]);
  useEffect(() => {
    const drop = () => {
      clearTimeout(timer.current);
      typing.current = false;
    };
    // Off to another page (a card, the menu): the words still waiting stay
    // unsent, or they would go out after the click and cancel it.
    const leaving = (url: string) => {
      if (url.split(/[?#]/)[0] !== Router.asPath.split(/[?#]/)[0]) drop();
    };
    // Back or Forward: dropped too — sent, they would undo the move — and the
    // box says what the address does (Next may have landed already, or not yet:
    // the effect above follows once it does).
    const onPop = () => {
      drop();
      pushed.current = word(queryNow().q);
      setValue(pushed.current);
    };
    Router.events.on("routeChangeStart", leaving);
    window.addEventListener("popstate", onPop);
    return () => {
      Router.events.off("routeChangeStart", leaving);
      window.removeEventListener("popstate", onPop);
      drop();
    };
  }, []);

  function apply(next: string) {
    clearTimeout(timer.current);
    typing.current = false;
    if (next === pushed.current) return;
    pushed.current = next;
    // On the address as it will be: a filter ticked during the pause, or while
    // this is on its way, stays — and so does the word. New words, new
    // results: back to their first page.
    void pushQuery({ q: next || undefined });
    // Not sent: a move the visitor is making (the search bar, a link) stands,
    // and the box says what the address does — `target` never saw the word.
    const now = word(queryNow().q);
    if (now !== next) {
      pushed.current = now;
      setValue(now);
    }
  }

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    typing.current = true;
    // A full pause, not the gap between two letters: 300ms fired mid-word.
    timer.current = setTimeout(() => apply(next.trim()), 600);
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("results.search")}
        aria-label={t("results.search")}
        maxLength={80}
        autoComplete="off"
        className="w-full rounded-xl border border-ink-100 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-ink-900 shadow-xs placeholder:text-ink-500 focus:border-brand-500 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            apply("");
          }}
          aria-label={t("results.clearSearch")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
