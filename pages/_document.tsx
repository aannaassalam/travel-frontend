import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  // §2 / §6: French is the product's default language, not English. The header
  // switcher overrides it client-side and persists the choice (§14: never
  // auto-detect from IP without an obvious persistent override).
  return (
    <Html lang="fr">
      <Head>
        <link rel="icon" href="/img/logo-mark.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#0A2540" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
