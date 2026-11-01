import { getSiteFooter, SiteContent } from "@/lib/api";
import { localized, translate } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { Locale, Localized } from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";

/**
 * The words the office edits from the admin's "Website content" screen.
 *
 * Pages that are generated ahead of time (home, About, Help, Contact) fetch
 * their section on the server and take it as a prop, so the edited wording is
 * in the HTML. The footer sits on every page, static or not, so it asks for
 * its own lines from the browser — once per visit.
 */
export function useSiteFooter(): SiteContent["footer"] | undefined {
  const { data } = useQuery({
    queryKey: ["site-footer"],
    queryFn: ({ signal }) => getSiteFooter({ signal }),
    // Edited a few times a year; once per visit is plenty.
    staleTime: 5 * 60_000,
    retry: 1
  });
  return data;
}

/**
 * An edited text in the visitor's language. The wording built into the site
 * stands in when the office has not written one, or the API did not answer —
 * a page is never left with a hole in it.
 */
export const siteText = (field: Localized | undefined, locale: Locale, key: string) => {
  const own = field?.[locale];
  if (own) return own;
  // Kept as the built-in wording (in French and English): the built-in text in
  // this language says the same. Rewritten by the office: their own words, in
  // the fallback language — a custom text says something the built-in does not.
  const typed = Object.entries(field ?? {}).filter(([, v]) => v);
  const unchanged = typed.every(([l, v]) => v!.trim() === translate(l as Locale, key).trim());
  return (unchanged ? "" : localized(field, locale)) || translate(locale, key);
};

/**
 * The cancellation terms in brief, as the office worded them. One sentence for
 * the whole site: the footer, the price box on every offer, the checkout
 * summary and the top of the Terms page must never say different things.
 */
export function usePolicyNotice(): string {
  const footer = useSiteFooter();
  const { locale } = usePrefs();
  return siteText(footer?.notice, locale, "policy.body");
}

/** The bold words in front of that sentence ("Conditions d'annulation"), edited beside it. */
export function usePolicyTitle(): string {
  const footer = useSiteFooter();
  const { locale } = usePrefs();
  return siteText(footer?.noticeTitle, locale, "policy.title");
}

/** The same reminder where the sentence does not fit: the badge on offer cards. */
export function usePolicyShort(): string {
  const footer = useSiteFooter();
  const { locale } = usePrefs();
  return siteText(footer?.noticeShort, locale, "policy.short");
}
