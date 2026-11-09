import {
  BASE_CURRENCY,
  CURRENCIES,
  Currency,
  DEFAULT_LOCALE,
  Locale,
  LOCALES
} from "@/typescript/interface/domain.interface";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSiteCurrencies, updateProfile } from "./api";
import { dirOf, localized as pickLocalized, translate } from "./i18n";
import { pickCurrency } from "./money";
import { Localized } from "@/typescript/interface/domain.interface";

/**
 * Locale, currency, and list or grid on the results pages.
 *
 * The language: the visitor's pick in the switcher (saved), else French,
 * whatever the browser's language (2026-11-06). Never from IP (§14); only a
 * pick is saved.
 */

type Prefs = {
  locale: Locale;
  /** "rtl" while Arabic is chosen: for the odd component that must know (a scroller, a slide-in side). */
  dir: "ltr" | "rtl";
  /** The currency prices are shown in (`pickCurrency`). */
  currency: Currency;
  /** What the currency pickers offer: francs and each currency the office set a rate for. */
  currencies: Currency[];
  /** The office's rates (francs per 1 unit of each), once /site/currencies has answered. */
  rates?: Partial<Record<Currency, number>>;
  /** A grid until the visitor chooses (2026-11-06; it was a list). */
  view: ResultsView;
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  setView: (v: ResultsView) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  lz: (field: Localized | string | undefined) => string;
};

export type ResultsView = "list" | "grid";

const KEY = "ct.prefs";
/** The list or grid choice, for this tab only: every new visit opens on a grid. */
const VIEW_KEY = "ct.view";
const PrefsContext = createContext<Prefs | null>(null);

/**
 * The language and direction on <html>. _document renders lang="fr" and its
 * inline script applies the saved language before the first
 * paint; this keeps it right from then on, so a page is not announced as
 * French (§BUG-027) or laid out left to right in Arabic.
 */
const applyToDocument = (l: Locale) => {
  document.documentElement.lang = l;
  document.documentElement.dir = dirOf(l);
};

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  // French on the server and first client render (they must agree); a
  // saved language applies right after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  // The visitor's own choice, if they made one: what is shown is worked out below.
  const [savedCurrency, setSavedCurrency] = useState<Currency>();
  const [view, setViewState] = useState<ResultsView>("grid");
  const qc = useQueryClient();

  // Read after mount, not during render: the server has no localStorage and a
  // mismatched first paint is a hydration error.
  useEffect(() => {
    let savedLocale: Locale | undefined;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (LOCALES.includes(saved.locale)) savedLocale = saved.locale;
      if (CURRENCIES.includes(saved.currency)) setSavedCurrency(saved.currency);
    } catch {
      /* corrupt or unavailable storage just means defaults */
    }
    // No saved choice: French, not saved (only a pick is).
    const l = savedLocale ?? DEFAULT_LOCALE;
    setLocaleState(l);
    applyToDocument(l);
    try {
      const view = sessionStorage.getItem(VIEW_KEY);
      if (view === "list" || view === "grid") setViewState(view);
    } catch {
      /* no session storage: the grid */
    }
  }, []);

  const persist = useCallback((next: Partial<Prefs>) => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      localStorage.setItem(KEY, JSON.stringify({ ...saved, ...next }));
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      persist({ locale: l });
      applyToDocument(l);
      // Signed in: the server keeps it for this customer's SMS and e-mails.
      // Fire and forget: the switch never waits on it or shows its failure.
      if (qc.getQueryData(["session"])) updateProfile({ locale: l }).catch(() => {});
    },
    [persist, qc]
  );
  const setCurrency = useCallback(
    (c: Currency) => {
      setSavedCurrency(c);
      persist({ currency: c });
    },
    [persist]
  );

  /**
   * Asked once a visit. Nothing is known on the server render or the first
   * client one, so both show the default (francs) and cannot disagree; a saved
   * choice and the offered list apply right after.
   */
  const { data: fx } = useQuery({
    queryKey: ["site-currencies"],
    queryFn: ({ signal }) => getSiteCurrencies({ signal }),
    staleTime: 5 * 60_000,
    retry: 1
  });
  const offered = fx && CURRENCIES.filter((c) => c === BASE_CURRENCY || fx.offered.includes(c));
  const currency = pickCurrency(savedCurrency, offered);
  // Before the answer: the currency on show, and francs, which are always offered.
  const currencies = offered ?? CURRENCIES.filter((c) => c === BASE_CURRENCY || c === currency);

  const setView = useCallback((v: ResultsView) => {
    setViewState(v);
    try {
      sessionStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  );
  const lz = useCallback(
    (field: Localized | string | undefined) => pickLocalized(field, locale),
    [locale]
  );

  const dir = dirOf(locale);

  return (
    <PrefsContext.Provider
      value={{ locale, dir, currency, currencies, rates: fx?.rates as Prefs["rates"], view, setLocale, setCurrency, setView, t, lz }}
    >
      {/* Radix menus, selects and popovers read their direction from here. */}
      <DirectionProvider dir={dir}>{children}</DirectionProvider>
    </PrefsContext.Provider>
  );
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}
