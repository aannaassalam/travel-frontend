import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { InlineSelect } from "@/components/ui/InlineSelect";
import {
  CURRENCIES,
  Currency,
  ENABLED_LOCALES,
  Locale
} from "@/typescript/interface/domain.interface";
import {
  Bus,
  Car,
  Compass,
  Hotel,
  LifeBuoy,
  Menu,
  Plane,
  Building2,
  User,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Brand from "./Brand";

export const VERTICAL_NAV = [
  { href: "/flights", key: "nav.flights", Icon: Plane },
  { href: "/hotels", key: "nav.hotels", Icon: Hotel },
  { href: "/bus", key: "nav.bus", Icon: Bus },
  { href: "/cars", key: "nav.cars", Icon: Car },
  { href: "/activities", key: "nav.activities", Icon: Compass },
  { href: "/property", key: "nav.property", Icon: Building2 }
];

const LOCALE_LABEL: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  pt: "Português",
  es: "Español"
};

/**
 * §11.2 header. Booking.com's shape — brand left, currency/language/account
 * right, vertical tabs underneath — because that is what users have been
 * trained to expect and fighting it costs conversion.
 */
export default function Header({ transparent = false }: { transparent?: boolean }) {
  const { t, locale, setLocale, currency, setCurrency } = usePrefs();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Server-owned: the session cookie is httpOnly, so this is the only way to
  // know who is signed in. react-query keeps one answer shared across the app.
  const { customer: user } = useSession();

  useEffect(() => {
    setOpen(false);
  }, [router.asPath]);

  const isActive = (href: string) => router.pathname.startsWith(href);

  return (
    <header
      className={
        transparent
          ? "absolute inset-x-0 top-0 z-40 text-white"
          : "sticky top-0 z-40 text-white"
      }
    >
      {/* One translucent, blurred plate for both variants. Over the hero it
          lets the photograph through; on inner pages it sits on solid navy. */}
      <div
        className={
          transparent
            ? "bg-brand-900/55 backdrop-blur-xl"
            : "bg-brand-900/95 shadow-md backdrop-blur-xl"
        }
      >
        <div className="container-site flex h-18 items-center justify-between gap-4">
          <Brand />

          <div className="flex items-center gap-1.5">
            <div className="hidden items-center rounded-lg bg-white/10 p-0.5 ring-1 ring-white/15 ring-inset sm:flex">
              <InlineSelect
                id="currency-select"
                tone="dark"
                ariaLabel={t("common.currency")}
                value={currency}
                onValueChange={(v) => setCurrency(v as Currency)}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
              <span className="h-4 w-px bg-white/20" aria-hidden="true" />
              <InlineSelect
                id="locale-select"
                tone="dark"
                ariaLabel={t("common.language")}
                value={locale}
                onValueChange={(v) => setLocale(v as Locale)}
                options={ENABLED_LOCALES.map((l) => ({ value: l, label: LOCALE_LABEL[l] }))}
              />
            </div>

            <Link
              href="/help"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white md:inline-flex"
            >
              <LifeBuoy className="size-4" />
              {t("nav.help")}
            </Link>

            <Link
              href={user ? "/account" : "/login"}
              className="hidden items-center gap-1.5 rounded-lg bg-white/12 px-3.5 py-2 text-sm font-semibold ring-1 ring-white/20 transition-colors ring-inset hover:bg-white/20 sm:inline-flex"
            >
              <User className="size-4" />
              {user ? t("nav.account") : t("nav.signin")}
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="rounded-lg p-2.5 transition-colors hover:bg-white/10 lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
              <span className="sr-only">{open ? t("nav.close") : t("nav.menu")}</span>
            </button>
          </div>
        </div>

        <nav
          aria-label={t("footer.services")}
          className="container-site hidden items-center gap-0.5 pb-2.5 lg:flex"
        >
          {VERTICAL_NAV.map(({ href, key, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              // Underline rather than a pill: it is quieter, and it keeps the
              // amber CTA as the only strongly filled thing in the chrome.
              className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                isActive(href) ? "text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              {t(key)}
              {isActive(href) && (
                <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-accent-500" />
              )}
            </Link>
          ))}
        </nav>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label={t("nav.menu")}
          className="border-t border-white/15 bg-brand-900 lg:hidden"
        >
          <div className="container-site grid gap-1 py-3">
            {VERTICAL_NAV.map(({ href, key, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium hover:bg-white/10"
              >
                <Icon className="size-5" />
                {t(key)}
              </Link>
            ))}
            <div className="my-1 h-px bg-white/15" />
            <Link
              href={user ? "/account" : "/login"}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium hover:bg-white/10"
            >
              <User className="size-5" />
              {user ? t("nav.account") : t("nav.signin")}
            </Link>
            <Link
              href="/help"
              className="flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium hover:bg-white/10"
            >
              <LifeBuoy className="size-5" />
              {t("nav.help")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
