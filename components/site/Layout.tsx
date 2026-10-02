import { usePrefs } from "@/lib/prefs";
import { NextSeo } from "next-seo";
import Head from "next/head";
import { useRouter } from "next/router";
import Footer from "./Footer";
import Header from "./Header";

/**
 * The canonical origin every absolute URL on the site is built from: the
 * canonical link, og:url, og:image, hreflang and the JSON-LD. Overridable by
 * env so a staging deploy does not advertise production URLs to crawlers.
 */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://flexiairbnb.com").replace(/\/$/, "");

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
  const path = router.asPath.split("?")[0];
  const canonical = `${SITE}${path === "/" ? "" : path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <NextSeo
        title={`${title} | CongoTravel`}
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
          siteName: "CongoTravel",
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
              // Server-rendered constants from our own catalogue, never user input.
              dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
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
      <main id="contenu" className={transparentHeader ? "" : "min-h-[60vh]"}>
        {children}
      </main>
      <Footer />
    </>
  );
}
