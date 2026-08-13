import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { usePrefs } from "@/lib/prefs";
import { parsePolicyBody } from "@/lib/policy";
import { getPolicy, safely, type Policy } from "@/lib/api";
import { Lock } from "lucide-react";
import type { GetStaticProps } from "next";

/**
 * §12.4: both stores require a reachable privacy policy URL, and the Data
 * Safety / Privacy Nutrition Label declarations must match what is actually
 * collected. This page is the source of truth those declarations copy from,
 * so it lists real fields rather than boilerplate.
 */
const SECTIONS = {
  fr: [
    {
      heading: "Ce que nous collectons",
      body: "Votre numéro de téléphone (identifiant du compte), votre nom, votre adresse e-mail si vous en fournissez une, et les données nécessaires à la prestation réservée : noms des voyageurs, dates, et pour les vols le type et le numéro de la pièce d'identité. Nous enregistrons également l'acceptation horodatée de nos conditions."
    },
    {
      heading: "Ce que nous ne collectons pas",
      body: "Nous ne voyons ni ne stockons vos numéros de carte bancaire : les paiements par carte se font sur la page sécurisée de notre prestataire. Nous ne collectons pas votre localisation en arrière-plan, ni vos contacts."
    },
    {
      heading: "Combien de temps nous les gardons",
      body: "Les numéros de passeport et de pièce d'identité sont chiffrés et supprimés automatiquement 90 jours après la fin du voyage. Les données de réservation sont conservées le temps requis par les obligations comptables. Les journaux techniques sont conservés 90 jours."
    },
    {
      heading: "Comment elles sont protégées",
      body: "Les données sensibles sont chiffrées au repos. Les documents de voyage sont stockés dans des espaces privés et servis par des liens signés à durée limitée, jamais par une adresse publique permanente. Les accès aux données sont journalisés."
    },
    {
      heading: "Avec qui nous les partageons",
      body: "Uniquement avec les prestataires nécessaires à votre réservation : compagnie aérienne, hôtel, loueur, opérateur de bus, et notre prestataire de paiement. Nous ne vendons aucune donnée et n'utilisons pas de traceurs publicitaires tiers."
    },
    {
      heading: "Vos droits",
      body: "Vous pouvez consulter et corriger vos données depuis votre compte, et supprimer votre compte à tout moment depuis la page Profil. Les réservations déjà payées restent enregistrées pour des raisons comptables et légales."
    },
    {
      heading: "Nous contacter",
      body: "Écrivez à privacy@congotravel.cd ou passez à notre bureau de Gombe. Nous répondons sous 30 jours."
    }
  ],
  en: [
    {
      heading: "What we collect",
      body: "Your phone number (your account identifier), your name, your email address if you give one, and whatever the booked service needs: traveller names, dates, and for flights the type and number of the identity document. We also record the timestamped acceptance of our terms."
    },
    {
      heading: "What we do not collect",
      body: "We never see or store your card numbers: card payments happen on our provider's secure page. We do not collect background location, and we do not collect your contacts."
    },
    {
      heading: "How long we keep it",
      body: "Passport and ID numbers are encrypted and deleted automatically 90 days after travel ends. Booking data is kept for as long as accounting obligations require. Technical logs are kept for 90 days."
    },
    {
      heading: "How it is protected",
      body: "Sensitive data is encrypted at rest. Travel documents live in private storage and are served through short-lived signed links, never a permanent public address. Access to data is logged."
    },
    {
      heading: "Who we share it with",
      body: "Only the suppliers your booking requires: the airline, hotel, car hire company, bus operator, and our payment provider. We sell no data and use no third-party advertising trackers."
    },
    {
      heading: "Your rights",
      body: "You can view and correct your data from your account, and delete your account at any time from the Profile page. Bookings already paid remain on record for accounting and legal reasons."
    },
    {
      heading: "Contacting us",
      body: "Write to privacy@congotravel.cd or come to our Gombe office. We reply within 30 days."
    }
  ]
};

/**
 * Same contract as /terms: the published version wins, the constant above is
 * the fallback. §12.4 makes this page load-bearing for both app stores, so it
 * must render even when the API is unreachable.
 */
export default function PrivacyPage({ privacy }: { privacy: Policy | null }) {
  const { t, locale } = usePrefs();
  const l = locale === "en" ? "en" : "fr";
  const published = privacy?.bodies[l] ?? privacy?.bodies.fr;
  const parsed = published ? parsePolicyBody(published) : [];
  // An admin can save a body with no `## ` heading in it. That is a badly
  // formatted document, not a reason to render a blank privacy policy.
  const sections = parsed.length ? parsed : SECTIONS[l];

  return (
    <Layout
      title={t("footer.privacy")}
      description={sections[0].body.slice(0, 200)}
      image="/img/banner-2.svg"
    >
      <div className="container-site max-w-3xl py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("footer.privacy") }]}
        />
        <h1 className="display text-3xl text-brand-900">
          {t("footer.privacy")}
        </h1>

        <p className="mt-6 flex items-start gap-3 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset text-[15px] text-ink-900">
          <Lock className="mt-0.5 size-5 shrink-0 text-brand-500" />
          {locale === "fr"
            ? "Nous collectons le minimum nécessaire pour vous transporter et vous loger, et nous supprimons ce qui n'est plus utile. Ce que nous ne détenons pas ne peut pas fuiter."
            : "We collect the minimum needed to move and house you, and delete what is no longer useful. What we do not hold cannot leak."}
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-xl font-bold text-brand-900">{s.heading}</h2>
              <p className="text-[15px] leading-relaxed text-ink-700">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<{ privacy: Policy | null }> = async () => ({
  props: { privacy: await safely(() => getPolicy("PRIVACY"), null) },
  revalidate: 300
});
