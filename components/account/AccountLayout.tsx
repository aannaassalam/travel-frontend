import Layout from "@/components/site/Layout";
import { usePrefs } from "@/lib/prefs";
import { useLogout, useSession } from "@/lib/session";
import { InlineSelect } from "@/components/ui/InlineSelect";
import type { CustomerSession } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CURRENCIES,
  Currency,
  ENABLED_LOCALES,
  Locale
} from "@/typescript/interface/domain.interface";
import {
  CalendarCheck,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

const NAV = [
  { href: "/account", key: "account.dashboard", Icon: LayoutDashboard },
  { href: "/account/bookings", key: "account.bookings", Icon: CalendarCheck },
  { href: "/account/enquiries", key: "account.enquiries", Icon: MessageSquareText },
  { href: "/account/saved", key: "account.saved", Icon: Heart },
  { href: "/account/profile", key: "account.profile", Icon: UserRound }
];

/**
 * Account shell. Every account page is `noindex` (§10.2 for the admin, and the
 * same reasoning applies to a customer's own booking history).
 */
export default function AccountLayout({
  children,
  title
}: {
  children: (user: CustomerSession) => React.ReactNode;
  title: string;
}) {
  const { t, locale, setLocale, currency, setCurrency } = usePrefs();
  const router = useRouter();
  /**
   * The session lives in an httpOnly cookie the browser cannot read, so only
   * the server can answer "is this person signed in".
   *
   * This used to read a `localStorage` copy, which stopped being written the
   * moment sign-in moved to a real session — so the API happily returned a
   * valid session while this screen insisted nobody was logged in. Two sources
   * of truth for identity is one too many.
   */
  const { customer, isPending } = useSession();
  const user = isPending ? undefined : customer;
  const logout = useLogout();

  function signOut() {
    logout.mutate(undefined, { onSettled: () => router.push("/") });
  }

  return (
    <Layout title={title} description={t("account.title")} noindex>
      <div className="border-b border-ink-100/70 bg-brand-900">
        <div className="container-site py-8">
          <h1 className="display text-2xl text-white sm:text-3xl">
            {t("account.title")}
          </h1>
          {user && (
            <p className="mt-1 text-white/70">
              {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user.phone}
            </p>
          )}
        </div>
      </div>

      <div className="container-site grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label={t("account.title")} className="lg:sticky lg:top-24 lg:h-fit">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map(({ href, key, Icon }) => {
              const active =
                href === "/account"
                  ? router.pathname === "/account"
                  : router.pathname.startsWith(href);
              return (
                <li key={href} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-700 hover:bg-ink-50"
                    )}
                  >
                    <Icon className="size-4" />
                    {t(key)}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 space-y-3 rounded-card p-5 ring-1 ring-ink-100 ring-inset">
            <h2 className="text-sm font-bold text-brand-900">
              {t("account.preferences")}
            </h2>
            <div className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("common.language")}
              </span>
              <InlineSelect
                ariaLabel={t("common.language")}
                value={locale}
                onValueChange={(v) => setLocale(v as Locale)}
                options={ENABLED_LOCALES.map((l) => ({
                  value: l,
                  label: l === "fr" ? "Français" : "English"
                }))}
                triggerClassName="w-full justify-between"
              />
            </div>
            <div className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("common.currency")}
              </span>
              <InlineSelect
                ariaLabel={t("common.currency")}
                value={currency}
                onValueChange={(v) => setCurrency(v as Currency)}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                triggerClassName="w-full justify-between"
              />
            </div>
          </div>

          {user && (
            <button
              type="button"
              onClick={signOut}
              className="mt-4 flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              <LogOut className="size-4" />
              {t("nav.signout")}
            </button>
          )}
        </nav>

        <div className="min-w-0">
          {user === undefined ? (
            <p className="text-ink-500">{t("common.loading")}…</p>
          ) : user ? (
            children(user)
          ) : (
            <div className="surface p-8 text-center">
              <UserRound className="mx-auto mb-3 size-10 text-ink-300" />
              <h2 className="text-lg font-bold text-brand-900">{t("auth.title")}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
                {t("auth.subtitle")} {t("auth.noAccountNote")}
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex rounded-md bg-accent-500 px-5 py-3 font-bold text-brand-900 hover:bg-accent-600"
              >
                {t("nav.signin")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
