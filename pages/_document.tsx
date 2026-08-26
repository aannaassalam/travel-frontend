import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  // §2 / §6: French is the product's default language, not English. The header
  // switcher overrides it client-side and persists the choice (§14: never
  // auto-detect from IP without an obvious persistent override).
  return (
    <Html lang="fr">
      <Head>
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
