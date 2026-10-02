import {
  Currency,
  DEFAULT_LOCALE,
  Locale
} from "@/typescript/interface/domain.interface";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { localized as pickLocalized, translate } from "./i18n";
import { Localized } from "@/typescript/interface/domain.interface";

/**
 * Locale, currency and low-data mode.
 *
 * §14 "auto-detecting language from IP without an obvious persistent override"
 * is on the avoid list, so there is no detection at all: French is the default
 * and the switcher in the header is the only thing that changes it.
 */

type Prefs = {
  locale: Locale;
  currency: Currency;
  lowData: boolean;
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  setLowData: (v: boolean) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  lz: (field: Localized | undefined) => string;
};

const KEY = "ct.prefs";
const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [lowData, setLowDataState] = useState(false);

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
      if (saved.currency) setCurrencyState(saved.currency);
      if (saved.lowData) setLowDataState(saved.lowData);
    } catch {
      /* corrupt or unavailable storage just means defaults */
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
      setCurrencyState(c);
      persist({ currency: c });
    },
    [persist]
  );
  const setLowData = useCallback(
    (v: boolean) => {
      setLowDataState(v);
      persist({ lowData: v });
    },
    [persist]
  );

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
      value={{ locale, currency, lowData, setLocale, setCurrency, setLowData, t, lz }}
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
