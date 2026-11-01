import { isRtl } from "@/lib/i18n";
import { LOCALES } from "@/typescript/interface/domain.interface";
import { Head, Html, Main, NextScript } from "next/document";

/**
 * The saved language, else the browser's (as `pickLocale` in lib/i18n.ts),
 * and its direction, put on <html> before the first paint so an Arabic page
 * does not draw left to right first. lib/prefs.tsx keeps them right from then
 * on; "ct.prefs" is its storage key.
 */
const RESTORE_LOCALE = `try{var L=${JSON.stringify(
  LOCALES
)},l;try{l=JSON.parse(localStorage.getItem("ct.prefs")||"{}").locale}catch(e){}if(L.indexOf(l)<0){l="en";for(var n=(navigator.languages||[]).concat(navigator.language),i=0;i<n.length;i++){var p=String(n[i]).toLowerCase().split(/[-_]/)[0];if(L.indexOf(p)>=0){l=p;break}}}var d=document.documentElement;d.lang=l;d.dir=${JSON.stringify(
  LOCALES.filter(isRtl)
)}.indexOf(l)>=0?"rtl":"ltr"}catch(e){}`;

export default function Document() {
  // Served in French, the office's language (pages vary by visitor only after
  // the script below). A first visit then reads the browser's language, else
  // English; the header switcher saves a pick (§14: never from IP).
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
