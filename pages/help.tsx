import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { getSiteContent, safely, type SiteContent } from "@/lib/api";
import { dial, useSiteContact, waLink } from "@/lib/contact";
import { localized } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { siteText } from "@/lib/siteContent";
import { MessageCircle, Phone } from "lucide-react";
import { GetStaticProps } from "next";
import Link from "next/link";

/**
 * §11.4 JSON-LD FAQPage: these are questions people actually type, and the
 * answers repeat the cancellation terms rather than hiding them — a customer
 * who discovers them at the payment step is a customer who abandons.
 *
 * This is the list the page shipped with (message keys). The office edits its
 * own in the admin's "Website content" screen; this one shows until it has, and whenever
 * the API cannot be reached while the page is being built.
 */
const FAQ = [
  { q: "pg.help.cancel.q", a: "pg.help.cancel.a" },
  { q: "pg.help.pay.q", a: "pg.help.pay.a" },
  { q: "pg.help.noResults.q", a: "pg.help.noResults.a" },
  { q: "pg.help.currency.q", a: "pg.help.currency.a" },
  { q: "pg.help.noEmail.q", a: "pg.help.noEmail.a" },
  { q: "pg.help.documents.q", a: "pg.help.documents.a" },
  { q: "pg.help.airlineCancels.q", a: "pg.help.airlineCancels.a" },
  { q: "pg.help.property.q", a: "pg.help.property.a" }
];

interface Props {
  /** As the office last saved it; null if the API did not answer at build time. */
  help: SiteContent["help"] | null;
}

export default function HelpPage({ help }: Props) {
  const contact = useSiteContact();
  const { t, locale } = usePrefs();
  const faq = help
    ? help.faq
        .map((item) => ({
          q: localized(item.question, locale),
          a: localized(item.answer, locale)
        }))
        .filter((item) => item.q && item.a)
    : FAQ.map((item) => ({ q: t(item.q), a: t(item.a) }));
  const intro = siteText(help?.intro, locale, "pg.help.intro");

  return (
    <Layout
      title={t("nav.help")}
      description={(faq[0]?.a ?? intro).slice(0, 200)}
      image="/img/banner-1.svg"
      // A FAQPage with no questions is invalid markup; say nothing instead.
      jsonLd={
        faq.length
          ? {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a }
              }))
            }
          : undefined
      }
    >
      <div className="container-site max-w-3xl py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("nav.help") }]}
        />
        <h1 className="display text-3xl text-brand-900">
          {t("nav.help")}
        </h1>
        <p className="mt-2 text-[15px] text-ink-500">{intro}</p>

        <div className="mt-8 space-y-3">
          {faq.map((item, i) => (
            // Native disclosure: keyboard-operable, screen-reader-correct and
            // zero JavaScript — which matters on a metered 3G connection.
            <details
              key={i}
              open={i === 0}
              className="group surface"
            >
              <summary className="cursor-pointer list-none px-5 py-4 text-[15px] font-bold text-brand-900 marker:hidden">
                {item.q}
              </summary>
              <p className="whitespace-pre-line border-t border-ink-100/70 px-5 py-4 text-[15px] leading-relaxed text-ink-700">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10 rounded-lg bg-brand-900 p-6 text-white">
          <h2 className="text-xl font-bold">
            {siteText(help?.contactTitle, locale, "pg.help.contactTitle")}
          </h2>
          <p className="mt-2 text-white/75">
            {siteText(help?.contactText, locale, "pg.help.contactText")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`tel:${dial(contact.phone)}`}
              className="btn btn-lg btn-primary"
            >
              <Phone className="size-4" />
              <span dir="ltr">{contact.phone}</span>
            </a>
            <a
              href={waLink(contact.whatsapp)}
              className="inline-flex items-center gap-2 rounded-md border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-md border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              {t("footer.contact")}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * ISR, like the legal pages: `revalidate` is what carries an edit made in the
 * admin onto the public site without a deploy.
 */
export const getStaticProps: GetStaticProps<Props> = async () => {
  const site = await safely(() => getSiteContent(), null);
  return { props: { help: site?.help ?? null }, revalidate: 300 };
};
