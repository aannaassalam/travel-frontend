import { isRtl } from "@/lib/i18n";
import { LOCALES } from "@/typescript/interface/domain.interface";
import { Head, Html, Main, NextScript } from "next/document";

/**
 * The saved language, else French (as lib/prefs.tsx), and its direction,
 * put on <html> before the first paint so an Arabic page
 * does not draw left to right first. lib/prefs.tsx keeps them right from then
 * on; "ct.prefs" is its storage key.
 */
const RESTORE_LOCALE = `try{var L=${JSON.stringify(
  LOCALES
)},l;try{l=JSON.parse(localStorage.getItem("ct.prefs")||"{}").locale}catch(e){}if(L.indexOf(l)<0)l="fr";var d=document.documentElement;d.lang=l;d.dir=${JSON.stringify(
  LOCALES.filter(isRtl)
)}.indexOf(l)>=0?"rtl":"ltr"}catch(e){}`;

export default function Document() {
  // Served in French, the office's language and every first visit's
  // (2026-11-06: whatever the browser's); the script below applies a pick
  // saved from the header switcher (§14: never from IP).
  return (
    <Html lang="fr">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: RESTORE_LOCALE }} />
        {/* .ico first and unsized: it carries 16/32/48 and is what older
            browsers and Windows pick up. The 192 is Android's home-screen
            size; apple-touch-icon is opaque because iOS composites
            transparency onto black and applies its own rounding. */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/img/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#0A2540" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
