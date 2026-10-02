import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { dial, useSiteContact, waLink } from "@/lib/contact";
import { usePrefs } from "@/lib/prefs";
import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

/**
 * §11.4 JSON-LD FAQPage: these are questions people actually type, and the
 * answers repeat the no-refund policy rather than hiding it — a customer who
 * discovers it at the payment step is a customer who abandons.
 */
const FAQ = {
  fr: [
    {
      q: "Puis-je annuler et être remboursé ?",
      a: "Non. Toutes nos réservations sont définitives et non remboursables. Vous pouvez demander l'annulation d'une réservation en nous contactant, ce qui libère la place ou la chambre, mais aucune somme n'est restituée. Cette condition vous est présentée trois fois avant le paiement et votre acceptation est enregistrée."
    },
    {
      q: "Comment puis-je payer ?",
      a: "En espèces, à notre bureau de Gombe, avec la référence reçue par SMS. Votre réservation est maintenue 48 heures ; passé ce délai elle est annulée automatiquement et les places sont remises en vente."
    },
    {
      q: "Ma recherche ne donne aucun résultat. Pourquoi ?",
      a: "Nous achetons nos places et nos chambres à l'avance : notre stock est réel mais limité. Si rien ne correspond, remplissez le formulaire de demande. Nous cherchons pour vous et revenons avec un prix ferme, sans engagement de votre part."
    },
    {
      q: "Dans quelle devise vais-je être débité ?",
      a: "Les prix sont établis en dollars américains. Si vous affichez le site en francs congolais ou en euros, le montant exact qui sera débité vous est indiqué avant validation, dans la devise de règlement. Le taux est verrouillé au moment de la commande."
    },
    {
      q: "Je n'ai pas d'adresse e-mail. Puis-je réserver ?",
      a: "Oui. Votre numéro de téléphone suffit. La confirmation, la référence et les instructions arrivent par SMS, et un lien vous permet de définir un mot de passe pour suivre votre réservation."
    },
    {
      q: "Quand vais-je recevoir mon billet ou mon voucher ?",
      a: "Sous 24 heures ouvrées après confirmation du paiement. Les documents apparaissent dans votre compte et vous recevez un SMS. Nous n'envoyons jamais un document par un lien public permanent."
    },
    {
      q: "Que se passe-t-il si la compagnie annule mon vol ?",
      a: "Contactez-nous immédiatement. Ces situations ne relèvent pas de la politique de non-remboursement : elles sont traitées au cas par cas par la direction, qui vous propose une solution."
    },
    {
      q: "Puis-je acheter un bien immobilier en ligne ?",
      a: "Non. L'immobilier se traite uniquement par contact direct avec notre agent : visite, vérification des documents chez le notaire, puis transaction hors plateforme. Le site sert à vous mettre en relation."
    }
  ],
  en: [
    {
      q: "Can I cancel and get a refund?",
      a: "No. All our bookings are final and non-refundable. You can ask us to cancel a booking, which releases the seat or room, but no money is returned. This condition is shown to you three times before payment and your acceptance is recorded."
    },
    {
      q: "How can I pay?",
      a: "In cash, at our Gombe office, with the reference sent by SMS. Your booking is held for 48 hours; after that it is cancelled automatically and the stock returns to sale."
    },
    {
      q: "My search returns nothing. Why?",
      a: "We buy our seats and rooms in advance: our stock is real but limited. If nothing matches, fill in the request form. We source it and come back with a firm price, with no commitment from you."
    },
    {
      q: "Which currency will I be charged in?",
      a: "Prices are set in US dollars. If you view the site in Congolese francs or euros, the exact amount to be charged is shown before you confirm, in the settlement currency. The rate is locked when you order."
    },
    {
      q: "I have no email address. Can I still book?",
      a: "Yes. Your phone number is enough. The confirmation, reference and instructions arrive by SMS, and a link lets you set a password to track your booking."
    },
    {
      q: "When do I get my ticket or voucher?",
      a: "Within 24 working hours of payment being confirmed. Documents appear in your account and you get an SMS. We never send a document as a permanent public link."
    },
    {
      q: "What if the airline cancels my flight?",
      a: "Contact us immediately. These situations fall outside the no-refund policy: they are handled case by case by management, who will propose a solution."
    },
    {
      q: "Can I buy a property online?",
      a: "No. Property is handled only through direct contact with our agent: a viewing, document checks at the notary, then a transaction off the platform. The site is there to put you in touch."
    }
  ]
};

export default function HelpPage() {
  const contact = useSiteContact();
  const { t, locale } = usePrefs();
  const faq = FAQ[locale === "en" ? "en" : "fr"];

  return (
    <Layout
      title={t("nav.help")}
      description={faq[0].a.slice(0, 200)}
      image="/img/banner-1.svg"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a }
        }))
      }}
    >
      <div className="container-site max-w-3xl py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("nav.help") }]}
        />
        <h1 className="display text-3xl text-brand-900">
          {t("nav.help")}
        </h1>
        <p className="mt-2 text-[15px] text-ink-500">
          {locale === "fr"
            ? "Les questions qu'on nous pose le plus souvent, avec des réponses directes."
            : "The questions we get asked most, answered directly."}
        </p>

        <div className="mt-8 space-y-3">
          {faq.map((item, i) => (
            // Native disclosure: keyboard-operable, screen-reader-correct and
            // zero JavaScript — which matters on a metered 3G connection.
            <details
              key={item.q}
              open={i === 0}
              className="group surface"
            >
              <summary className="cursor-pointer list-none px-5 py-4 text-[15px] font-bold text-brand-900 marker:hidden">
                {item.q}
              </summary>
              <p className="border-t border-ink-100/70 px-5 py-4 text-[15px] leading-relaxed text-ink-700">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10 rounded-lg bg-brand-900 p-6 text-white">
          <h2 className="text-xl font-bold">
            {locale === "fr" ? "Vous n'avez pas trouvé ?" : "Still stuck?"}
          </h2>
          <p className="mt-2 text-white/75">
            {locale === "fr"
              ? "Appelez-nous ou écrivez sur WhatsApp du lundi au samedi, 08 h 00 – 18 h 00."
              : "Call us or message on WhatsApp, Monday to Saturday, 08:00 – 18:00."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`tel:${dial(contact.phone)}`}
              className="btn btn-lg btn-primary"
            >
              <Phone className="size-4" />
              {contact.phone}
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
