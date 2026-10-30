import { PAGE_SIZE, pageHref, pageItems } from "@/lib/paging";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

const CELL =
  "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg px-3 text-sm font-semibold";
const LINK = "bg-white text-brand-900 ring-1 ring-ink-100 ring-inset hover:ring-brand-500";

/**
 * Under a page of results: "Affichage de 31–60 sur 86", then Previous, the page
 * numbers and Next. Links, not buttons: `?page=` is in the address, so a page
 * can be shared or opened in a tab, the back button steps through, and a click
 * lands at the top like any page. Nothing when everything fits on one page.
 * Previous and Next stay in place at the ends, greyed, so the buttons do not
 * jump under a finger tapping through.
 */
export default function Pager({ page, pages, total }: { page: number; pages: number; total: number }) {
  const { t } = usePrefs();
  const router = useRouter();
  if (pages <= 1 || page > pages) return null;
  const href = (n: number) => pageHref(router.pathname, router.query, n);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  // The page stays mounted and scrolls to the top: so does the keyboard.
  const toTop = () => document.getElementById("contenu")?.focus({ preventScroll: true });

  const step = (n: number, label: string, icon: React.ReactNode, rel: "prev" | "next") =>
    n >= 1 && n <= pages ? (
      <Link href={href(n)} rel={rel} onClick={toTop} className={cn(CELL, LINK)}>
        {rel === "prev" && icon}
        {label}
        {rel === "next" && icon}
      </Link>
    ) : (
      <span aria-disabled="true" className={cn(CELL, "text-ink-300")}>
        {rel === "prev" && icon}
        {label}
        {rel === "next" && icon}
      </span>
    );

  return (
    <nav aria-label={t("results.pages")} className="col-span-full flex flex-col items-center gap-3 py-2">
      <p className="text-sm text-ink-500">{t("results.showing", { from, to, total })}</p>
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>{step(page - 1, t("results.prev"), <ChevronLeft className="size-4" aria-hidden />, "prev")}</li>
        {pageItems(page, pages).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-ink-500">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                onClick={toTop}
                aria-label={t("results.page", { n })}
                aria-current={n === page ? "page" : undefined}
                className={cn(CELL, n === page ? "bg-brand-900 text-white" : LINK)}
              >
                {n}
              </Link>
            </li>
          )
        )}
        <li>{step(page + 1, t("results.next"), <ChevronRight className="size-4" aria-hidden />, "next")}</li>
      </ul>
    </nav>
  );
}

/** A page past the last one — typed by hand, or kept from a wider search. */
export function PageGone() {
  const { t } = usePrefs();
  const router = useRouter();
  return (
    <div className="rounded-card bg-ink-50 p-8 text-center ring-1 ring-ink-100 ring-inset">
      <p className="font-bold text-brand-900">{t("results.pageGone")}</p>
      <Link href={pageHref(router.pathname, router.query, 1)} className="btn btn-md btn-dark mt-4">
        {t("results.firstPage")}
      </Link>
    </div>
  );
}
