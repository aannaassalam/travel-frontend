import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { getSiteContent, safely, type SiteContent } from "@/lib/api";
import { localized } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Banknote, MapPin, PackageCheck, Users } from "lucide-react";
import { GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";

/** One per block, in order, round again if the office adds a fifth. */
const ICONS = [PackageCheck, Banknote, Users, MapPin];
const BANNER = "/img/hero-river.svg";

/**
 * The wording this page shipped with. The office edits its own in the admin's
 * "Website content" screen; this is what shows until it has, and whenever the
 * API cannot be reached while the page is being built.
 */
const BUILT_IN = {
  fr: {
    title: "Une agence congolaise, avec du stock bien réel",
    intro:
      "Flexi Agency réserve des vols, des hôtels, des bus, des voitures et des excursions en République démocratique du Congo, et met en relation acheteurs et vendeurs de biens immobiliers.",
    sections: [
      {
        title: "Nous achetons avant de vendre",
        body: "Nous ne sommes pas un moteur de recherche branché sur un système de réservation mondial. Nous achetons des places, des chambres, des journées de véhicule et des créneaux d'excursion à l'avance, et nous les revendons. C'est notre argent qui est engagé, ce qui nous oblige à n'afficher que du stock réel."
      },
      {
        title: "Payer comme on paie ici",
        body: "Vous réservez en ligne et vous réglez en espèces à notre agence, avec la référence reçue par SMS. La réservation est maintenue 48 heures, le temps de passer nous voir."
      },
      {
        title: "Une équipe joignable",
        body: "Un bureau physique à Gombe, un numéro qui répond, un WhatsApp lu. Dans un marché où la réputation circule par les réseaux personnels, c'est ce qui compte le plus."
      },
      {
        title: "La RDC, pas le monde entier",
        body: "Nous couvrons Kinshasa, le Katanga, les Kivus, le Kasaï et le Kongo-Central. Nous préférons bien connaître huit villes plutôt que mal en connaître deux cents."
      }
    ],
    listTitle: "Ce que nous ne faisons pas",
    listItems: [
      "Nous ne remboursons pas. Toutes les réservations sont définitives, et nous vous le disons avant que vous payiez, pas après.",
      "Nous n'affichons pas de faux compteurs d'urgence. Quand il reste trois places, c'est qu'il en reste trois.",
      "Nous ne révélons aucun frais à la dernière étape. Le prix affiché est le prix payé.",
      "Nous ne vendons pas vos données et n'utilisons pas de traceurs publicitaires."
    ]
  },
  en: {
    title: "A Congolese agency, with genuinely real stock",
    intro:
      "Flexi Agency books flights, hotels, buses, cars and tours across the Democratic Republic of the Congo, and connects buyers and sellers of property.",
    sections: [
      {
        title: "We buy before we sell",
        body: "We are not a search engine plugged into a global reservation system. We buy seats, rooms, vehicle-days and tour slots in advance, and resell them. It is our own money at risk, which forces us to list only real stock."
      },
      {
        title: "Paying the way people pay here",
        body: "You book online and pay in cash at our office, with the reference sent by SMS. The booking is held for 48 hours, time enough to come and see us."
      },
      {
        title: "A team you can reach",
        body: "A physical office in Gombe, a number that answers, a WhatsApp that gets read. In a market where reputation travels through personal networks, that matters most."
      },
      {
        title: "The DRC, not the whole world",
        body: "We cover Kinshasa, Katanga, the Kivus, Kasaï and Kongo-Central. We would rather know eight cities well than two hundred badly."
      }
    ],
    listTitle: "What we do not do",
    listItems: [
      "We do not refund. All bookings are final, and we tell you before you pay, not after.",
      "We do not run fake urgency counters. When three seats are left, three seats are left.",
      "We do not reveal a fee at the last step. The price shown is the price paid.",
      "We do not sell your data and use no advertising trackers."
    ]
  }
};

interface Props {
  /** As the office last saved it; null if the API did not answer at build time. */
  about: SiteContent["about"] | null;
}

export default function AboutPage({ about }: Props) {
  const { t, locale } = usePrefs();

  const page = about
    ? {
        title: localized(about.title, locale),
        intro: localized(about.intro, locale),
        sections: about.sections.map((s) => ({
          title: localized(s.title, locale),
          body: localized(s.body, locale)
        })),
        listTitle: localized(about.listTitle, locale),
        listItems: about.listItems.map((line) => localized(line, locale)).filter(Boolean)
      }
    : BUILT_IN[locale === "en" ? "en" : "fr"];
  const banner = about?.image ? mediaUrl(about.image) : BANNER;

  return (
    <Layout
      title={t("footer.about")}
      description={(page.sections[0]?.body ?? page.intro).slice(0, 200)}
      image={banner}
    >
      <section className="relative">
        <div className="absolute inset-0">
          <Image
            src={banner}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-brand-900/70" />
        </div>
        <div className="container-site relative py-16">
          <h1 className="display max-w-2xl text-3xl leading-tight text-white sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-2xl text-white/85">{page.intro}</p>
        </div>
      </section>

      <div className="container-site py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("footer.about") }]}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {page.sections.map(({ title, body }, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <section key={i} className="surface p-6">
                <span className="mb-3 inline-flex size-11 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="size-5 text-brand-500" />
                </span>
                <h2 className="mb-2 text-lg font-bold text-brand-900">{title}</h2>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
                  {body}
                </p>
              </section>
            );
          })}
        </div>

        {/* Being upfront about the policy on the About page is deliberate. It is
            the thing customers most need to understand before they pay. */}
        {page.listItems.length > 0 && (
          <section className="mt-8 rounded-lg border-2 border-brand-900 bg-brand-50 p-6">
            <h2 className="text-lg font-bold text-brand-900">{page.listTitle}</h2>
            <ul className="mt-3 space-y-2 text-[15px] text-ink-700">
              {page.listItems.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500" />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/terms#no-refund"
              className="mt-4 inline-flex text-sm font-semibold text-brand-500 underline"
            >
              {t("policy.readFull")}
            </Link>
          </section>
        )}
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
  return { props: { about: site?.about ?? null }, revalidate: 300 };
};
