import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { usePrefs } from "@/lib/prefs";
import { Banknote, MapPin, PackageCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  const { t, locale } = usePrefs();
  const fr = locale !== "en";

  const pillars = [
    {
      Icon: PackageCheck,
      title: fr ? "Nous achetons avant de vendre" : "We buy before we sell",
      body: fr
        ? "Nous ne sommes pas un moteur de recherche branché sur un système de réservation mondial. Nous achetons des places, des chambres, des journées de véhicule et des créneaux d'excursion à l'avance, et nous les revendons. C'est notre argent qui est engagé, ce qui nous oblige à n'afficher que du stock réel."
        : "We are not a search engine plugged into a global reservation system. We buy seats, rooms, vehicle-days and tour slots in advance, and resell them. It is our own money at risk, which forces us to list only real stock."
    },
    {
      Icon: Banknote,
      title: fr ? "Payer comme on paie ici" : "Paying the way people pay here",
      body: fr
        ? "Le mobile money est le moyen de paiement du pays, pas une option secondaire. M-Pesa, Orange Money, Airtel Money et Afrimoney sont au même niveau que la carte bancaire, et les espèces en agence restent possibles pour toute réservation."
        : "Mobile money is how the country pays, not a secondary option. M-Pesa, Orange Money, Airtel Money and Afrimoney sit alongside cards, and cash at the office remains possible for any booking."
    },
    {
      Icon: Users,
      title: fr ? "Une équipe joignable" : "A team you can reach",
      body: fr
        ? "Un bureau physique à Gombe, un numéro qui répond, un WhatsApp lu. Dans un marché où la réputation circule par les réseaux personnels, c'est ce qui compte le plus."
        : "A physical office in Gombe, a number that answers, a WhatsApp that gets read. In a market where reputation travels through personal networks, that matters most."
    },
    {
      Icon: MapPin,
      title: fr ? "La RDC, pas le monde entier" : "The DRC, not the whole world",
      body: fr
        ? "Nous couvrons Kinshasa, le Katanga, les Kivus, le Kasaï et le Kongo-Central. Nous préférons bien connaître huit villes plutôt que mal en connaître deux cents."
        : "We cover Kinshasa, Katanga, the Kivus, Kasaï and Kongo-Central. We would rather know eight cities well than two hundred badly."
    }
  ];

  return (
    <Layout
      title={t("footer.about")}
      description={pillars[0].body.slice(0, 200)}
      image="/img/hero-river.svg"
    >
      <section className="relative">
        <div className="absolute inset-0">
          <Image
            src="/img/hero-river.svg"
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
            {fr
              ? "Une agence congolaise, avec du stock bien réel"
              : "A Congolese agency, with genuinely real stock"}
          </h1>
          <p className="mt-4 max-w-2xl text-white/85">
            {fr
              ? "CongoTravel réserve des vols, des hôtels, des bus, des voitures et des excursions en République démocratique du Congo, et met en relation acheteurs et vendeurs de biens immobiliers."
              : "CongoTravel books flights, hotels, buses, cars and tours across the Democratic Republic of the Congo, and connects buyers and sellers of property."}
          </p>
        </div>
      </section>

      <div className="container-site py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("footer.about") }]}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {pillars.map(({ Icon, title, body }) => (
            <section key={title} className="surface p-6">
              <span className="mb-3 inline-flex size-11 items-center justify-center rounded-lg bg-brand-50">
                <Icon className="size-5 text-brand-500" />
              </span>
              <h2 className="mb-2 text-lg font-bold text-brand-900">{title}</h2>
              <p className="text-[15px] leading-relaxed text-ink-700">{body}</p>
            </section>
          ))}
        </div>

        {/* Being upfront about the policy on the About page is deliberate. It is
            the thing customers most need to understand before they pay. */}
        <section className="mt-8 rounded-lg border-2 border-brand-900 bg-brand-50 p-6">
          <h2 className="text-lg font-bold text-brand-900">
            {fr ? "Ce que nous ne faisons pas" : "What we do not do"}
          </h2>
          <ul className="mt-3 space-y-2 text-[15px] text-ink-700">
            {(fr
              ? [
                  "Nous ne remboursons pas. Toutes les réservations sont définitives, et nous vous le disons avant que vous payiez, pas après.",
                  "Nous n'affichons pas de faux compteurs d'urgence. Quand il reste trois places, c'est qu'il en reste trois.",
                  "Nous ne révélons aucun frais à la dernière étape. Le prix affiché est le prix payé.",
                  "Nous ne vendons pas vos données et n'utilisons pas de traceurs publicitaires."
                ]
              : [
                  "We do not refund. All bookings are final, and we tell you before you pay, not after.",
                  "We do not run fake urgency counters. When three seats are left, three seats are left.",
                  "We do not reveal a fee at the last step. The price shown is the price paid.",
                  "We do not sell your data and use no advertising trackers."
                ]
            ).map((line) => (
              <li key={line} className="flex gap-2">
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
      </div>
    </Layout>
  );
}
