import {
  BASE_CURRENCY,
  CURRENCIES,
  Currency,
  DEFAULT_LOCALE,
  Locale
} from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSiteCurrencies } from "./api";
import { localized as pickLocalized, translate } from "./i18n";
import { pickCurrency } from "./money";
import { Localized } from "@/typescript/interface/domain.interface";

/**
 * Locale, currency, low-data mode, and list or grid on the results pages.
 *
 * §14 "auto-detecting language from IP without an obvious persistent override"
 * is on the avoid list, so there is no detection at all: French is the default
 * and the switcher in the header is the only thing that changes it.
 */

type Prefs = {
  locale: Locale;
  /** The currency prices are shown in (`pickCurrency`). */
  currency: Currency;
  /** What the currency pickers offer: francs and each currency the office set a rate for. */
  currencies: Currency[];
  /** The office's rates (francs per 1 unit of each), once /site/currencies has answered. */
  rates?: Partial<Record<Currency, number>>;
  lowData: boolean;
  /** Undefined until the visitor chooses this visit: each page then shows its own default, a list. */
  view?: ResultsView;
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  setLowData: (v: boolean) => void;
  setView: (v: ResultsView) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  lz: (field: Localized | undefined) => string;
};

export type ResultsView = "list" | "grid";

const KEY = "ct.prefs";
/** The list or grid choice, for this tab only: every new visit opens on a list. */
const VIEW_KEY = "ct.view";
const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  // The visitor's own choice, if they made one: what is shown is worked out below.
  const [savedCurrency, setSavedCurrency] = useState<Currency>();
  const [lowData, setLowDataState] = useState(false);
  const [view, setViewState] = useState<ResultsView>();

  // Read after mount, not during render: the server has no localStorage and a
  // mismatched first paint is a hydration error.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (saved.locale) {
        setLocaleState(saved.locale);
        // _document renders lang="fr"; reflect a saved choice on load so an
        // English user's page is not announced as French (§BUG-027).
        document.documentElement.lang = saved.locale;
      }
      if (CURRENCIES.includes(saved.currency)) setSavedCurrency(saved.currency);
      if (saved.lowData) setLowDataState(saved.lowData);
    } catch {
      /* corrupt or unavailable storage just means defaults */
    }
    try {
      const view = sessionStorage.getItem(VIEW_KEY);
      if (view === "list" || view === "grid") setViewState(view);
    } catch {
      /* no session storage: the page's own default */
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
      document.documentElement.lang = l;
    },
    [persist]
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

  const setLowData = useCallback(
    (v: boolean) => {
      setLowDataState(v);
      persist({ lowData: v });
    },
    [persist]
  );
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
    (field: Localized | undefined) => pickLocalized(field, locale),
    [locale]
  );

  return (
    <PrefsContext.Provider
      value={{ locale, currency, currencies, rates: fx?.rates as Prefs["rates"], lowData, view, setLocale, setCurrency, setLowData, setView, t, lz }}
    >
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}
