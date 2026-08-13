import { usePrefs } from "@/lib/prefs";
import { MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Brand from "./Brand";
import { VERTICAL_NAV } from "./Header";

/** §9.1 — the rails that actually matter in this market, named plainly. */
const PAYMENT_METHODS = [
  "M-Pesa",
  "Orange Money",
  "Airtel Money",
  "Afrimoney",
  "Visa",
  "Mastercard",
  "Espèces"
];

export default function Footer() {
  const { t, lowData, setLowData } = usePrefs();

  return (
    <footer className="mt-16 bg-brand-900 text-white">
      <div className="container-site grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          {/* Room here for the full lockup, tagline and all. */}
          <Brand variant="full" />
          <p className="max-w-xs text-sm text-white/70">{t("brand.tagline")}</p>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent-500" />
              12, avenue Colonel Lukusa, Gombe, Kinshasa
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-accent-500" />
              <a href="tel:+243810000000" className="hover:underline">
                +243 81 000 00 00
              </a>
            </li>
            <li className="flex gap-2">
              <MessageCircle className="mt-0.5 size-4 shrink-0 text-accent-500" />
              <a href="https://wa.me/243810000000" className="hover:underline">
                WhatsApp — {t("home.trustHours")}
              </a>
            </li>
          </ul>
        </div>

        <nav aria-labelledby="f-services">
          <h2 id="f-services" className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">
            {t("footer.services")}
          </h2>
          <ul className="space-y-2 text-sm">
            {VERTICAL_NAV.map(({ href, key }) => (
              <li key={href}>
                <Link href={href} className="text-white/85 hover:text-white hover:underline">
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="f-company">
          <h2 id="f-company" className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">
            {t("footer.company")}
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-white/85 hover:text-white hover:underline">
                {t("footer.about")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-white/85 hover:text-white hover:underline">
                {t("footer.contact")}
              </Link>
            </li>
            <li>
              <Link href="/help" className="text-white/85 hover:text-white hover:underline">
                {t("footer.help")}
              </Link>
            </li>
            <li>
              <Link href="/account" className="text-white/85 hover:text-white hover:underline">
                {t("nav.account")}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="f-legal">
          <h2 id="f-legal" className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">
            {t("footer.legal")}
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/terms" className="text-white/85 hover:text-white hover:underline">
                {t("footer.terms")}
              </Link>
            </li>
            <li>
              <Link
                href="/terms#no-refund"
                className="text-white/85 hover:text-white hover:underline"
              >
                {t("footer.policy")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-white/85 hover:text-white hover:underline">
                {t("footer.privacy")}
              </Link>
            </li>
          </ul>

          {/* §11.7 low-data mode: bandwidth is expensive in-market. */}
          <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm text-white/85">
            <input
              type="checkbox"
              checked={lowData}
              onChange={(e) => setLowData(e.target.checked)}
              className="size-4 accent-accent-500"
            />
            {t("footer.lowData")}
          </label>
        </nav>
      </div>

      <div className="border-t border-white/15">
        <div className="container-site flex flex-col gap-4 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-white/60">
              {t("footer.payments")}
            </span>
            {PAYMENT_METHODS.map((p) => (
              <span
                key={p}
                className="rounded border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/85"
              >
                {p}
              </span>
            ))}
          </div>

          {/* §2.2(3): stated plainly, never in fine print. */}
          <p className="flex items-start gap-2 text-sm text-white/70">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-500" />
            {t("policy.body")}
          </p>

          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} CongoTravel SARL. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
