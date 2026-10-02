import { usePrefs } from "@/lib/prefs";
import { Search, X } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

/**
 * The "search these results" box on every listing page.
 *
 * What is typed goes to the API as `q` — never a client-side filter, the page
 * only ever shows what the server matched. Like every other filter it lives in
 * the URL, so a search can be shared and the back button steps through it.
 * Debounced so typing a word is one request rather than one per letter.
 */
export default function ResultsSearch({ className }: { className?: string }) {
  const router = useRouter();
  const { t } = usePrefs();
  const inUrl = typeof router.query.q === "string" ? router.query.q : "";
  const [value, setValue] = useState(inUrl);
  // What this box last put in the URL. A URL change that is not ours — back,
  // forward, a shared link — replaces the text; our own landing leaves it alone,
  // so a word still being typed is never overwritten by its first half.
  const pushed = useRef(inUrl);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (inUrl !== pushed.current) {
      pushed.current = inUrl;
      setValue(inUrl);
    }
  }, [inUrl]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(next: string) {
    clearTimeout(timer.current);
    if (next === pushed.current) return;
    pushed.current = next;
    const query = { ...router.query };
    delete query.q;
    // A filter clicked while this navigation is in flight cancels it (the
    // filter's own push wins, without q). Then the word goes on top of that.
    void router
      .push(
        { pathname: router.pathname, query: next ? { ...query, q: next } : query },
        undefined,
        { scroll: false }
      )
      .then((landed) => {
        if (!landed && pushed.current === next) {
          pushed.current = "";
          apply(next);
        }
      });
  }

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
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
