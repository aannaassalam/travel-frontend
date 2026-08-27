import LeadForm from "@/components/catalog/LeadForm";
import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { dial, useSiteContact } from "@/lib/contact";
import { usePrefs } from "@/lib/prefs";
import { Clock, MapPin, MessageCircle, Phone , Mail } from "lucide-react";
import Image from "next/image";

export default function ContactPage() {
  const contact = useSiteContact();
  const { t, locale } = usePrefs();

  return (
    <Layout
      title={t("footer.contact")}
      description={
        locale === "fr"
          ? "Bureau à Gombe, Kinshasa. Téléphone, WhatsApp et paiement en espèces sur place."
          : "Office in Gombe, Kinshasa. Phone, WhatsApp and cash payment on site."
      }
      image="/img/dest-kinshasa.svg"
      jsonLd={{
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
      }}
    >
      <div className="container-site py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("footer.contact") }]}
        />
        <h1 className="display text-3xl text-brand-900">
          {t("footer.contact")}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-500">
          {locale === "fr"
            ? "Une vraie personne répond, au bureau comme au téléphone. Vous pouvez aussi venir régler votre réservation en espèces."
            : "A real person answers, in the office and on the phone. You can also come and settle a booking in cash."}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
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
                  lines: [contact.phone].filter(Boolean)
                },
                {
                  Icon: MessageCircle,
                  title: "WhatsApp",
                  lines: [contact.whatsapp].filter(Boolean)
                },
                {
                  Icon: Clock,
                  title: locale === "fr" ? "Horaires" : "Opening hours",
                  lines: [contact.officeHours].filter(Boolean)
                },
                ...(contact.email
                  ? [{ Icon: Mail, title: "Email", lines: [contact.email] }]
                  : [])
                // Every line comes from Settings, so the office edits its own
                // details. `.filter(Boolean)` keeps a blank field from
                // rendering an empty row under a heading.
              ].map(({ Icon, title, lines }) => (
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
                        {line}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <div className="relative h-56 overflow-hidden rounded-lg">
              <Image
                src="/img/dest-kinshasa.svg"
                alt="Kinshasa"
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
            </div>
          </div>

          <div className="surface p-6">
            <h2 className="text-xl font-bold text-brand-900">
              {locale === "fr" ? "Écrivez-nous" : "Write to us"}
            </h2>
            <p className="mb-5 mt-1 text-sm text-ink-500">
              {locale === "fr"
                ? "Nous rappelons sous 24 heures ouvrées au numéro que vous laissez."
                : "We call back within 24 working hours on the number you leave."}
            </p>
            <LeadForm kind="REQUEST_TO_BOOK" vertical="FLIGHT" compact />
          </div>
        </div>
      </div>
    </Layout>
  );
}
