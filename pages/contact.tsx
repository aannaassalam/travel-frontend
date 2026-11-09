import LeadForm from "@/components/catalog/LeadForm";
import LocationMap from "@/components/catalog/LocationMap";
import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { getSiteContent, safely, type SiteContent } from "@/lib/api";
import { dial, officeLines, officeTitle, useSiteContact } from "@/lib/contact";
import { usePrefs } from "@/lib/prefs";
import { siteText } from "@/lib/siteContent";
import { Clock, MapPin, MessageCircle, Phone , Mail } from "lucide-react";
import { GetStaticProps } from "next";
import Image from "next/image";

interface Props {
  /** The page's wording as the office last saved it; null if the API did not answer. */
  copy: SiteContent["contact"] | null;
}

export default function ContactPage({ copy }: Props) {
  const contact = useSiteContact();
  const { t, locale } = usePrefs();
  const offices = contact.offices;

  return (
    <Layout
      title={t("footer.contact")}
      /*
        Was hardcoded to "Gombe, Kinshasa" while Settings say the office is in
        Kolwezi — the same drift the homepage CTA had. The city comes from the
        admin now, so it cannot go stale again.
      */
      description={
        contact.city
          ? t("pg.contact.description", { city: contact.city })
          : t("pg.contact.descriptionNoCity")
      }
      image="/img/photos/tshopo-village.webp"
      jsonLd={
        // One LocalBusiness per office, so each shows up for its own city.
        offices.length
          ? offices.map((o) => ({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: o.name || contact.companyName,
              ...(o.phone ? { telephone: dial(o.phone) } : {}),
              ...(o.email ? { email: o.email } : {}),
              ...(o.hours ? { openingHours: o.hours } : {}),
              address: {
                "@type": "PostalAddress",
                streetAddress: o.streetAddress,
                addressLocality: o.city,
                addressCountry: contact.country
              },
              ...(o.geo
                ? {
                    geo: {
                      "@type": "GeoCoordinates",
                      latitude: o.geo.lat,
                      longitude: o.geo.lng
                    }
                  }
                : {})
            }))
          : {
              "@context": "https://schema.org",
              "@type": "TravelAgency",
              name: contact.companyName,
              telephone: dial(contact.phone),
              ...(contact.officeHours ? { openingHours: contact.officeHours } : {}),
              address: {
                "@type": "PostalAddress",
                streetAddress: contact.streetAddress,
                addressLocality: contact.city,
                addressCountry: contact.country
              }
            }
      }
    >
      <div className="container-site py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("footer.contact") }]}
        />
        <h1 className="display text-3xl text-brand-900">
          {t("footer.contact")}
        </h1>
        <p className="mt-2 max-w-2xl whitespace-pre-line text-[15px] text-ink-500">
          {siteText(copy?.intro, locale, "pg.contact.intro")}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">
            {offices.length > 0 ? (
              <ul className="space-y-4">
                {offices.map((o) => (
                  <li key={o.id} className="surface overflow-hidden">
                    {/* Only an office with a pin gets a map: a city-centre
                        view would say nothing an address line does not. */}
                    {o.geo && (
                      <LocationMap
                        geo={o.geo}
                        label={[officeTitle(o), o.streetAddress].filter(Boolean).join(" — ")}
                        className="h-44"
                      />
                    )}
                    <div className="p-5">
                      <p className="font-bold text-brand-900">{officeTitle(o)}</p>
                      <ul className="mt-2 space-y-1.5">
                        {officeLines(o).map(({ Icon, text, href, external, dir }) => (
                          <li key={text} className="flex gap-2 text-[15px] text-ink-700">
                            <Icon className="mt-1 size-4 shrink-0 text-brand-500" />
                            {href ? (
                              <a
                                href={href}
                                dir={dir}
                                className="hover:underline"
                                {...(external
                                  ? { target: "_blank", rel: "noopener noreferrer" }
                                  : {})}
                              >
                                {text}
                              </a>
                            ) : (
                              text
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-4">
                {[
                  {
                    Icon: MapPin,
                    title: t("home.trustOffice"),
                    lines: [contact.streetAddress, contact.city].filter(Boolean)
                  },
                  {
                    Icon: Phone,
                    title: t("home.trustPhone"),
                    lines: [contact.phone].filter(Boolean),
                    ltr: true
                  },
                  {
                    Icon: MessageCircle,
                    title: "WhatsApp",
                    lines: [contact.whatsapp].filter(Boolean),
                    ltr: true
                  },
                  {
                    Icon: Clock,
                    title: t("pg.contact.hours"),
                    lines: [contact.officeHours].filter(Boolean)
                  },
                  ...(contact.email
                    ? [{ Icon: Mail, title: t("pg.contact.email"), lines: [contact.email], ltr: true }]
                    : [])
                  // Every line comes from Settings, so the office edits its own
                  // details. `.filter(Boolean)` keeps a blank field from
                  // rendering an empty row under a heading.
                ].map(({ Icon, title, lines, ltr }) => (
                  <li
                    key={title}
                    className="flex gap-4 surface p-5"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                      <Icon className="size-5 text-brand-500" />
                    </span>
                    <div>
                      <p className="font-bold text-brand-900">{title}</p>
                      {lines.map((line) => (
                        <p key={line} className="text-[15px] text-ink-700">
                          {ltr ? <span dir="ltr">{line}</span> : line}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/*
              Decorative, and deliberately not captioned as a place: the office
              is in Kolwezi, which has no photography on Unsplash at all, so
              labelling any picture as "our city" would be a claim we cannot
              support. This is the country they operate in — Tshopo province,
              by Toza Productions — with an empty alt so a screen reader skips
              it rather than being told a location that is not the office.
            */}
            <div className="relative h-56 overflow-hidden rounded-card">
              <Image
                src="/img/photos/tshopo-village.webp"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
            </div>
          </div>

          {/* min-w-0: a grid item defaults to min-width:auto, and the phone
              field's hidden native <select> (nowrap country names) would
              otherwise inflate the shared track past the viewport. */}
          <div className="min-w-0 surface p-6">
            <h2 className="text-xl font-bold text-brand-900">
              {siteText(copy?.formTitle, locale, "pg.contact.formTitle")}
            </h2>
            <p className="mb-5 mt-1 text-sm text-ink-500">
              {siteText(copy?.formIntro, locale, "pg.contact.formIntro")}
            </p>
            <LeadForm kind="CONTACT" compact />
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * ISR, like the legal pages: `revalidate` is what carries an edit made in the
 * admin onto the public site without a deploy. The office details themselves
 * still arrive in the browser, from Settings.
 */
export const getStaticProps: GetStaticProps<Props> = async () => {
  const site = await safely(() => getSiteContent(), null);
  return { props: { copy: site?.contact ?? null }, revalidate: 300 };
};
