import { usePrefs } from "@/lib/prefs";
import { MapPin, MessageCircle, Phone, ShieldCheck , Mail } from "lucide-react";
import Link from "next/link";
import Brand from "./Brand";
import { dial, useSiteContact, waLink } from "@/lib/contact";
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
  const contact = useSiteContact();
  const { t, lowData, setLowData } = usePrefs();

  /*
   * `wash-dark` rather than flat brand-900: it is the treatment the hero and
   * the office card already use — teal and amber washes over navy — and the
   * footer was the only dark surface on the site not using it, which is why it
   * read as a slab bolted to the bottom rather than part of the page.
   */
  return (
    <footer className="wash-dark mt-16 text-white">
      <div className="container-site grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          {/* Room here for the full lockup, tagline and all. */}
          <Brand variant="full" />
          <p className="display max-w-xs text-[17px] leading-snug text-white/90">{t("brand.tagline")}</p>
          {/* Read from Settings, not hardcoded: the office moves and changes
              numbers, and neither should need a developer (§15). */}
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent-500" />
              {[contact.streetAddress, contact.city].filter(Boolean).join(", ")}
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-accent-500" />
              <a href={`tel:${dial(contact.phone)}`} className="hover:underline">
                {contact.phone}
              </a>
            </li>
            <li className="flex gap-2">
              <MessageCircle className="mt-0.5 size-4 shrink-0 text-accent-500" />
              <a
                href={waLink(contact.whatsapp)}
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp — {contact.officeHours || t("home.trustHours")}
              </a>
            </li>
            {contact.email && (
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-accent-500" />
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <nav aria-labelledby="f-services">
          <h2 id="f-services" className="eyebrow mb-4 text-white/60">
            {t("footer.services")}
          </h2>
          <ul className="space-y-2 text-sm">
            {VERTICAL_NAV.map(({ href, key }) => (
              <li key={href}>
                <Link href={href} className="text-white/75 transition-colors hover:text-white">
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="f-company">
          <h2 id="f-company" className="eyebrow mb-4 text-white/60">
            {t("footer.company")}
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-white/75 transition-colors hover:text-white">
                {t("footer.about")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-white/75 transition-colors hover:text-white">
                {t("footer.contact")}
              </Link>
            </li>
            <li>
              <Link href="/help" className="text-white/75 transition-colors hover:text-white">
                {t("footer.help")}
              </Link>
            </li>
            <li>
              <Link href="/account" className="text-white/75 transition-colors hover:text-white">
                {t("nav.account")}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="f-legal">
          <h2 id="f-legal" className="eyebrow mb-4 text-white/60">
            {t("footer.legal")}
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/terms" className="text-white/75 transition-colors hover:text-white">
                {t("footer.terms")}
              </Link>
            </li>
            <li>
              <Link
                href="/terms#no-refund"
                className="text-white/75 transition-colors hover:text-white"
              >
                {t("footer.policy")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-white/75 transition-colors hover:text-white">
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
            {/* Its own line on a phone: inline, the label ate the row and left the
                first chip stranded on the end of it. */}
            <span className="eyebrow w-full text-white/60 sm:mr-1 sm:w-auto">
              {t("footer.payments")}
            </span>
            {PAYMENT_METHODS.map((p) => (
              <span
                key={p}
                className="rounded-lg bg-white/8 px-2.5 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/15 ring-inset"
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
