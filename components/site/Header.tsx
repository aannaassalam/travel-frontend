import { LOCALE_NAMES } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { InlineSelect } from "@/components/ui/InlineSelect";
import {
  Currency,
  ENABLED_LOCALES,
  Locale
} from "@/typescript/interface/domain.interface";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Bus,
  Car,
  CarFront,
  CarTaxiFront,
  ChevronDown,
  Compass,
  Hotel,
  LifeBuoy,
  MapIcon,
  Menu,
  Plane,
  Building2,
  ShoppingBag,
  Stamp,
  User,
  X
, UtensilsCrossed , Languages, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Brand from "./Brand";

/**
 * Menu order, and the order the footer and the homepage tabs follow too.
 *
 * Not alphabetical and not the order these were built: it is the order the
 * office sells in, so the two things people come here most for lead. Change it
 * here and every surface follows — Header, Footer and the hero tabs all read
 * this one list.
 */
export const VERTICAL_NAV = [
  // `tint`: the service's own colour, as on its cards and in the app.
  { href: "/hotels", key: "nav.hotels", Icon: Hotel, tint: "var(--color-v-hotel)" },
  { href: "/flights", key: "nav.flights", Icon: Plane, tint: "var(--color-v-flight)" },
  { href: "/bus", key: "nav.bus", Icon: Bus, tint: "var(--color-v-bus)" },
  { href: "/cars", key: "nav.cars", Icon: Car, tint: "var(--color-v-car)" },
  { href: "/transfers", key: "nav.transfers", Icon: CarTaxiFront, tint: "var(--color-v-transfer)" },
  { href: "/vehicles", key: "nav.vehicles", Icon: CarFront, tint: "var(--color-v-vehicle)" },
  { href: "/restaurants", key: "nav.restaurants", Icon: UtensilsCrossed, tint: "var(--color-v-restaurant)" },
  { href: "/duty-free", key: "nav.dutyFree", Icon: ShoppingBag, tint: "var(--color-v-dutyfree)" },
  { href: "/property", key: "nav.property", Icon: Building2, tint: "var(--color-v-property)" },
  { href: "/activities", key: "nav.activities", Icon: Compass, tint: "var(--color-v-activity)" },
  { href: "/e-visa", key: "nav.evisa", Icon: Stamp, tint: "var(--color-v-visa)" }
];
type Service = (typeof VERTICAL_NAV)[number];

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * One tab of the services bar. Quiet at rest — the icon carries the service's
 * colour, lifted so it reads on navy — and the page you are on sits in a soft
 * pill over the amber baseline the brand uses for "here".
 */
const tabClass = (active: boolean) =>
  cn(
    "relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition-colors duration-200",
    active
      ? "bg-white/11 text-white ring-1 ring-white/15 ring-inset"
      : "text-white/75 hover:bg-white/7 hover:text-white"
  );

function TabFace({ Icon, label, tint, active }: { Icon: Service["Icon"]; label: string; tint: string; active?: boolean }) {
  return (
    <>
      <Icon
        className="size-4 shrink-0 transition-colors duration-200"
        style={{ color: `color-mix(in oklab, ${tint} ${active ? 30 : 45}%, white)` }}
        aria-hidden="true"
      />
      {label}
    </>
  );
}

/**
 * The services bar: one row whatever the language or the width. Every service
 * that fits is a tab, in the office's order; the rest move under "More". The
 * row used to wrap — a lone "Activities & Tours" on a second line in English,
 * two in Russian — and the header grew past the 124px everything sticky below
 * it is placed by (--header-h).
 *
 * The fit is measured, not guessed: an invisible twin row holds every tab and
 * the More button at their real size, so a longer name in Russian, or a font
 * still loading, is counted as it is.
 */
function ServicesBar({ isActive }: { isActive: (href: string) => boolean }) {
  const { t, locale } = usePrefs();
  const rowRef = useRef<HTMLDivElement>(null);
  const twinRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(VERTICAL_NAV.length);

  useIsoLayoutEffect(() => {
    const row = rowRef.current;
    const twin = twinRef.current;
    if (!row || !twin) return;
    const fit = () => {
      const cells = [...twin.children] as HTMLElement[];
      const more = cells.pop()?.offsetWidth ?? 0;
      const widths = cells.map((c) => c.offsetWidth);
      const style = getComputedStyle(row);
      const gap = parseFloat(style.columnGap) || 0;
      const room = row.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd);
      const span = (n: number) => widths.slice(0, n).reduce((a, w) => a + w, 0) + gap * Math.max(0, n - 1);
      let n = widths.length;
      if (span(n) > room) while (n > 0 && span(n) + gap + more > room) n--;
      setShown(n);
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(row);
    document.fonts?.ready.then(fit).catch(() => undefined);
    return () => watch.disconnect();
  }, [locale]);

  const overflow = VERTICAL_NAV.slice(shown);
  const overflowActive = overflow.some((s) => isActive(s.href));

  return (
    <nav
      aria-label={t("footer.services")}
      // A hairline drawn, not a border: a border would add a pixel to --header-h.
      className="relative hidden shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] lg:block"
    >
      <div ref={rowRef} className="container-site flex h-13 items-center overflow-hidden">
        {VERTICAL_NAV.slice(0, shown).map(({ href, key, Icon, tint }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              <TabFace Icon={Icon} label={t(key)} tint={tint} active={active} />
              {active && <span className="absolute inset-x-3.5 -bottom-1.5 h-0.5 rounded-full bg-accent-500" />}
            </Link>
          );
        })}
        {overflow.length > 0 && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={cn(tabClass(overflowActive), "cursor-pointer data-[state=open]:bg-white/11 data-[state=open]:text-white")}>
              {t("nav.more")}
              <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
              {overflowActive && <span className="absolute inset-x-3.5 -bottom-1.5 h-0.5 rounded-full bg-accent-500" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="min-w-60 rounded-xl p-1.5">
              {overflow.map(({ href, key, Icon, tint }) => (
                <DropdownMenuItem key={href} asChild className="cursor-pointer gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-900 aria-[current=page]:bg-ink-50">
                  <Link href={href} aria-current={isActive(href) ? "page" : undefined}>
                    <ServiceMark Icon={Icon} tint={tint} />
                    {t(key)}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {/* The measuring twin: every tab and the More button at their real size, never seen. */}
      <div ref={twinRef} aria-hidden="true" className="pointer-events-none invisible absolute top-0 flex h-0 overflow-hidden">
        {VERTICAL_NAV.map(({ href, key, Icon, tint }) => (
          <span key={href} className={tabClass(false)}>
            <TabFace Icon={Icon} label={t(key)} tint={tint} />
          </span>
        ))}
        <span className={tabClass(false)}>
          {t("nav.more")}
          <ChevronDown className="size-4" />
        </span>
      </div>
    </nav>
  );
}

/** A service's icon on a square of its colour: the More list and the phone menu. */
function ServiceMark({ Icon, tint, size = "sm" }: { Icon: Service["Icon"]; tint: string; size?: "sm" | "lg" }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center text-white", size === "lg" ? "size-11 rounded-xl" : "size-8 rounded-lg")}
      style={{ background: tint }}
      aria-hidden="true"
    >
      {/* Its own colour class: the dropdown greys any icon without one. */}
      <Icon className={cn("text-white", size === "lg" ? "size-5" : "size-4")} />
    </span>
  );
}

/**
 * §11.2 header. Booking.com's shape — brand left, currency/language/account
 * right, vertical tabs underneath — because that is what users have been
 * trained to expect and fighting it costs conversion.
 */
export default function Header({ transparent = false }: { transparent?: boolean }) {
  // Francs, and the currencies the office has set a rate for: the API has prices in no other.
  const { t, locale, setLocale, currency, currencies, setCurrency } = usePrefs();
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
      {/*
        * Translucent ONLY over the hero, where there is a photograph worth
        * letting through. On inner pages it is solid.
        *
        * It used to be 95% + blur everywhere, and 5% of the cream page body
        * bled through: the header painted #17304a while the footer painted
        * #0a2540 and the search band beneath it #0e2f4f — three different
        * navies down one screen, and a visible seam under the nav. An opaque
        * layer also has nothing behind it to blur, so the filter was buying a
        * compositing layer and no pixels.
        */}
      <div
        className={
          transparent
            ? "bg-brand-900/55 backdrop-blur-xl"
            : "bg-brand-900 shadow-md"
        }
      >
        {/* This row's height, and the services row's below it, are what
            --header-h (styles/globals.css) says the header takes: everything
            that sticks under it or is scrolled to goes by that. */}
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
                options={currencies.map((c) => ({ value: c, label: c }))}
              />
              <span className="h-4 w-px bg-white/20" aria-hidden="true" />
              <InlineSelect
                id="locale-select"
                tone="dark"
                ariaLabel={t("common.language")}
                value={locale}
                onValueChange={(v) => setLocale(v as Locale)}
                options={ENABLED_LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
              />
            </div>

            <Link
              href="/carte"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white md:inline-flex"
            >
              <MapIcon className="size-4" />
              {t("map.nav")}
            </Link>

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

        <ServicesBar isActive={isActive} />
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label={t("nav.menu")}
          // Opens downward from the bar, and scrolls on its own on a short phone.
          className="max-h-[calc(100dvh-var(--header-h))] overflow-y-auto border-t border-white/10 bg-brand-900 shadow-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200 lg:hidden"
        >
          <div className="container-site grid gap-1 py-4">
            {/* The services as a grid of tiles: all nine in sight at once, each
                in its colour — a list of nine rows pushed account and language
                below the fold. */}
            <div className="grid grid-cols-3 gap-1.5">
              {VERTICAL_NAV.map(({ href, key, Icon, tint }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className="flex flex-col items-center gap-2 rounded-xl px-1.5 py-3 text-center text-[13px] leading-tight font-semibold text-white/85 transition-colors hover:bg-white/7 hover:text-white aria-[current=page]:bg-white/11 aria-[current=page]:text-white aria-[current=page]:ring-1 aria-[current=page]:ring-accent-500/70 aria-[current=page]:ring-inset"
                >
                  <ServiceMark Icon={Icon} tint={tint} size="lg" />
                  {t(key)}
                </Link>
              ))}
            </div>
            <div className="my-2 h-px bg-white/10" />
            <Link
              href={user ? "/account" : "/login"}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium hover:bg-white/10"
            >
              <User className="size-5" />
              {user ? t("nav.account") : t("nav.signin")}
            </Link>
            <Link
              href="/carte"
              className="flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium hover:bg-white/10"
            >
              <MapIcon className="size-5" />
              {t("map.nav")}
            </Link>
            <Link
              href="/help"
              className="flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium hover:bg-white/10"
            >
              <LifeBuoy className="size-5" />
              {t("nav.help")}
            </Link>

            {/*
              * Currency and language, which used to exist only in the desktop
              * bar (`hidden sm:flex`) — so on a phone, the one device most of
              * this audience browses on, there was no way to switch either. A
              * visitor who wants prices in CDF could not ask for them.
              *
              * Given as full rows rather than the compact desktop pill: 44px
              * targets, and the label spelled out instead of inferred from a
              * three-letter code.
              */}
            <div className="my-1 h-px bg-white/10" />
            <div className="grid gap-2 px-3 py-2">
              <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
                <span className="flex items-center gap-3">
                  <Wallet className="size-5" />
                  {t("common.currency")}
                </span>
                <InlineSelect
                  tone="dark"
                  ariaLabel={t("common.currency")}
                  value={currency}
                  onValueChange={(v) => setCurrency(v as Currency)}
                  options={currencies.map((c) => ({ value: c, label: c }))}
                  triggerClassName="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15 ring-inset"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
                <span className="flex items-center gap-3">
                  <Languages className="size-5" />
                  {t("common.language")}
                </span>
                <InlineSelect
                  tone="dark"
                  ariaLabel={t("common.language")}
                  value={locale}
                  onValueChange={(v) => setLocale(v as Locale)}
                  options={ENABLED_LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
                  triggerClassName="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15 ring-inset"
                />
              </label>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
