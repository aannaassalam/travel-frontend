import { InlineSelect } from "@/components/ui/InlineSelect";
import { useDriver } from "@/lib/driver";
import { usePrefs } from "@/lib/prefs";
import { ENABLED_LOCALES, Locale } from "@/typescript/interface/domain.interface";
import { CarTaxiFront, UserRound } from "lucide-react";
import { NextSeo } from "next-seo";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

/**
 * The driver portal's shell: the mark, "Espace chauffeur", the language, and
 * two links. No site navigation — a driver between two rides is not browsing
 * hotels — and every page is noindex: nothing here is for a search engine.
 *
 * Pages that need a driver redirect to the login when the server says there is
 * none; `guest` is the login page itself.
 */
export default function DriverLayout({
  title,
  children,
  guest = false
}: {
  title: string;
  children: React.ReactNode;
  guest?: boolean;
}) {
  const { t, locale, setLocale } = usePrefs();
  const router = useRouter();
  const { driver, isPending } = useDriver();

  useEffect(() => {
    if (guest || isPending || driver) return;
    router.replace(`/driver?next=${encodeURIComponent(router.asPath)}`);
  }, [guest, isPending, driver, router]);

  return (
    <>
      <NextSeo title={`${title} | ${t("driver.portal")}`} noindex nofollow />
      <header className="sticky top-0 z-40 bg-brand-900 text-white shadow-md">
        <div className="container-site flex h-16 items-center justify-between gap-3">
          <Link
            href={driver ? "/driver/rides" : "/driver"}
            className="flex min-h-12 min-w-0 items-center gap-3"
            aria-label={t("driver.portal")}
          >
            <Image
              src="/img/logo-flexi-mark.webp"
              alt="Flexi Agency"
              width={160}
              height={177}
              className="h-9 w-auto"
              priority
            />
            <span className="truncate text-[15px] font-bold">{t("driver.portal")}</span>
          </Link>
          <div className="flex items-center gap-1">
            {/* 48px like the two links beside it: all three are pressed from a driver's seat. */}
            <InlineSelect
              tone="dark"
              triggerClassName="min-h-12"
              ariaLabel={t("common.language")}
              value={locale}
              onValueChange={(v) => setLocale(v as Locale)}
              options={ENABLED_LOCALES.map((l) => ({ value: l, label: l.toUpperCase() }))}
            />
            {driver && (
              <>
                {/* 48px targets: these are pressed from a driver's seat. */}
                <Link
                  href="/driver/rides"
                  aria-current={router.pathname.startsWith("/driver/rides") ? "page" : undefined}
                  className="flex size-12 items-center justify-center rounded-lg hover:bg-white/10 aria-[current=page]:bg-white/15"
                >
                  <CarTaxiFront className="size-5" aria-hidden="true" />
                  <span className="sr-only">{t("driver.rides")}</span>
                </Link>
                <Link
                  href="/driver/account"
                  aria-current={router.pathname === "/driver/account" ? "page" : undefined}
                  className="flex size-12 items-center justify-center rounded-lg hover:bg-white/10 aria-[current=page]:bg-white/15"
                >
                  <UserRound className="size-5" aria-hidden="true" />
                  <span className="sr-only">{t("driver.account")}</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {/* Bottom padding leaves room for the ride page's fixed alert bar. */}
      <main className="container-site max-w-2xl py-5 pb-32">
        {!guest && !driver ? (
          <p className="py-10 text-center text-ink-500">{t("common.loading")}…</p>
        ) : (
          children
        )}
      </main>
    </>
  );
}
