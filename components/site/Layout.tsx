import { useCart } from "@/lib/cart";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";
import { NextSeo } from "next-seo";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Footer from "./Footer";
import Header from "./Header";

/**
 * The canonical origin every absolute URL on the site is built from: the
 * canonical link, og:url, og:image, hreflang and the JSON-LD. Overridable by
 * env so a staging deploy does not advertise production URLs to crawlers.
 */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://flexiagency.net").replace(/\/$/, "");

/** The name after every page title, and the site name shared links carry. */
const BRAND = "Flexi Agency";

/**
 * §11.4: every page gets a title, a description, a canonical and hreflang
 * alternates including x-default → French. Structured data is passed in per
 * page rather than guessed here.
 */
export default function Layout({
  children,
  title,
  description,
  image = "/img/banner-1.svg",
  noindex,
  transparentHeader,
  jsonLd
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  transparentHeader?: boolean;
  jsonLd?: object | object[];
}) {
  const { locale } = usePrefs();
  const router = useRouter();
  const path = router.asPath.split(/[?#]/)[0];
  const canonical = `${SITE}${path === "/" ? "" : path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <NextSeo
        title={`${title} | ${BRAND}`}
        description={description}
        canonical={canonical}
        noindex={noindex}
        openGraph={{
          url: canonical,
          title,
          description,
          // Callers pass absolute mediaUrl() URLs for catalogue images; only a
          // relative path (our own /public assets) needs the origin prefixed,
          // or an absolute URL becomes `https://domainhttps://...`.
          images: [
            {
              url:
                image.startsWith("/") && !image.startsWith("//")
                  ? `${SITE}${image}`
                  : image
            }
          ],
          siteName: BRAND,
          locale
        }}
        languageAlternates={[
          { hrefLang: "fr", href: canonical },
          { hrefLang: "en", href: canonical },
          { hrefLang: "x-default", href: canonical }
        ]}
      />
      {blocks.length > 0 && (
        <Head>
          {blocks.map((block, i) => (
            <script
              key={i}
              type="application/ld+json"
              // Catalogue text is typed by staff and imported from spreadsheets,
              // so it is not trusted to stay inside this tag: with < escaped,
              // no title can close the script and start its own.
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(block).replace(/</g, "\\u003c")
              }}
            />
          ))}
        </Head>
      )}

      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-brand-900"
      >
        Aller au contenu
      </a>
      <Header transparent={transparentHeader} />
      {/* Not in the Tab order: back to top hands focus to it, unoutlined. */}
      <main
        id="contenu"
        tabIndex={-1}
        className={transparentHeader ? "outline-none" : "min-h-[60vh] outline-none"}
      >
        {children}
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}

/**
 * Back to the top, once a page has been scrolled about a screen. Bottom right,
 * clear of a phone's home bar. Smooth, or instant under reduced motion: the
 * page's own scroll-behavior decides (globals.css).
 *
 * Over the restaurant basket bar it sits above it, and in the layer just under
 * it, so the basket's opened list covers it rather than the reverse — its
 * remove buttons are on the same right-hand edge.
 */
function BackToTop() {
  const { t } = usePrefs();
  const router = useRouter();
  const { ready, count } = useCart();
  const [shown, setShown] = useState(false);
  const [covered, setCovered] = useState(false);
  const self = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setShown(window.scrollY > 600);
      // Where a menu ends, the basket bar scrolls up through the button's
      // spot: hidden for those few pixels rather than half under the bar.
      const bar = document.querySelector("[data-cart-bar]")?.getBoundingClientRect();
      const me = self.current?.getBoundingClientRect();
      setCovered(Boolean(bar && me && bar.top < me.bottom && bar.bottom > me.top));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The bar grows when its list of dishes opens, with no scroll.
    const grows = new ResizeObserver(onScroll);
    const bar = document.querySelector("[data-cart-bar]");
    if (bar) grows.observe(bar);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      grows.disconnect();
    };
    // Again when the basket bar comes or goes, and once the button is drawn:
    // the scroll that showed it could not measure it yet.
  }, [count, shown]);

  if (!shown) return null;
  const overBasket = router.pathname === "/restaurants/[slug]" && ready && count > 0;
  return (
    <button
      ref={self}
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0 });
        // The button goes at the top; focus goes there too, not to <body>.
        document.getElementById("contenu")?.focus({ preventScroll: true });
      }}
      aria-label={t("common.backToTop")}
      title={t("common.backToTop")}
      className={cn(
        "fixed right-[calc(1rem+env(safe-area-inset-right))] grid size-12 place-items-center rounded-full bg-brand-900 text-white shadow-lg ring-1 ring-white/20 transition-colors hover:bg-brand-700",
        overBasket
          ? "bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30",
        covered && "invisible"
      )}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
