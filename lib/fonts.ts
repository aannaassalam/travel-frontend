import {
  Bricolage_Grotesque,
  Fraunces,
  Inter,
  Libre_Baskerville,
  Merriweather,
  Roboto
} from "next/font/google";

/**
 * Display face for headlines only — body copy stays on Inter.
 *
 * §11.6 asks for one family and two weights on performance grounds. This is a
 * deliberate deviation: two weights of one extra family, subset to latin-ext so
 * French, Portuguese and Spanish diacritics are all covered, costs roughly
 * 20 KB and is the single largest step from "competent" to "premium". If the
 * 3G budget in §11.7 ever gets tight, this is the first thing to drop — remove
 * `--font-display` from globals.css and every headline falls back to Inter.
 */
export const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  // Two static instances rather than the variable font: next/font refuses
  // `axes` alongside explicit weights, and the optical-size axis is not worth
  // shipping the full variable file over a metered connection.
  weight: ["600", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--fraunces"
});

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--inter",
  style: ["normal"]
});

export const merri_weather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
  style: ["italic", "normal"],
  variable: "--merri"
});

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  display: "swap",
  style: ["italic", "normal"],
  variable: "--roboto"
});

export const bricolage_grotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--bricolage"
});

export const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["italic", "normal"],
  display: "swap",
  variable: "--libre"
});
