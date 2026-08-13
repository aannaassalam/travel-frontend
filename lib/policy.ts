import { Locale } from "@/typescript/interface/domain.interface";

/**
 * §2.2 / §13(6). The no-refund text is defined once, here, and referenced
 * everywhere — web, checkout, confirmation, e-mail, app — so the wording can
 * never diverge between surfaces.
 *
 * Versions are immutable and append-only. An order stores the *label and the
 * exact text it displayed*, so changing the policy later never rewrites what a
 * past customer actually agreed to. That record is what defends a chargeback.
 */

export interface PolicyVersion {
  id: string;
  label: string;
  effectiveFrom: string;
  /** Professionally translated per §6 — never machine-translated. */
  text: Record<Locale, string>;
}

export const POLICY_VERSIONS: PolicyVersion[] = [
  {
    id: "pv_2026_01",
    label: "v1.0",
    effectiveFrom: "2026-01-15",
    text: {
      fr: "Je comprends que cette réservation est définitive et non remboursable. Aucun remboursement ni annulation avec remboursement ne sera accordé.",
      en: "I understand that this booking is final and non-refundable. No refund, and no cancellation with refund, will be granted.",
      pt: "",
      es: ""
    }
  }
];

export const CURRENT_POLICY = POLICY_VERSIONS[POLICY_VERSIONS.length - 1];

export function policyText(locale: Locale): string {
  return CURRENT_POLICY.text[locale] || CURRENT_POLICY.text.fr;
}

/**
 * The full customer-facing terms, shown on /terms and linked from every
 * point where consent is captured.
 */
export interface PolicySection {
  heading: string;
  body: string;
}

/**
 * Parses the body stored by the admin's content section into the sections this
 * site renders. The stored format is the plain text an owner can type: a line
 * beginning with `## ` starts a section, everything after it is that section's
 * body.
 *
 * Deliberately not a Markdown library and deliberately not HTML. This text
 * comes out of the admin panel and goes straight into a page — rendering
 * arbitrary markup here would turn the content editor into a stored-XSS hole
 * for the sake of italics. Headings and paragraphs are all a legal page needs.
 */
export function parsePolicyBody(body: string): PolicySection[] {
  const sections: PolicySection[] = [];
  for (const line of body.split("\n")) {
    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      sections.push({ heading: heading[1].trim(), body: "" });
    } else if (line.trim() && sections.length) {
      const current = sections[sections.length - 1];
      current.body = current.body ? `${current.body}\n${line.trim()}` : line.trim();
    }
  }
  return sections.filter((s) => s.heading);
}

export const POLICY_SECTIONS: Record<
  Locale,
  { heading: string; body: string }[]
> = {
  fr: [
    {
      heading: "1. Réservations définitives",
      body: "Toutes les réservations effectuées sur cette plateforme sont définitives. Aucun remboursement n'est accordé, quelle qu'en soit la raison, une fois le paiement encaissé. Cette condition vous est présentée sur la page de l'offre, dans le récapitulatif de prix et à l'étape de paiement, et son acceptation est enregistrée avec votre réservation."
    },
    {
      heading: "2. Annulation sans remboursement",
      body: "Vous pouvez demander l'annulation d'une réservation en contactant notre service client. L'annulation libère les places ou les chambres concernées, mais n'ouvre droit à aucun remboursement, total ou partiel, ni à aucun avoir."
    },
    {
      heading: "3. Réservations payées en espèces",
      body: "Une réservation en espèces est maintenue 48 heures. Si le paiement n'est pas effectué avant l'échéance indiquée, la réservation est annulée automatiquement et les places sont remises en vente. Aucune somme n'est due de part et d'autre dans ce cas."
    },
    {
      heading: "4. Lorsque nous ne pouvons pas assurer la prestation",
      body: "Si un vol est annulé par la compagnie, si un hôtel n'honore pas une réservation confirmée, ou si nous ne pouvons pas fournir la prestation vendue, contactez-nous immédiatement. Ces situations sont traitées au cas par cas par la direction et ne relèvent pas de la politique de non-remboursement ci-dessus."
    },
    {
      heading: "5. Prix et devises",
      body: "Les prix sont établis en dollars américains. L'affichage en francs congolais ou en euros est une conversion au taux fixé par nos soins, verrouillé au moment de la commande. Le montant réellement débité vous est indiqué dans la devise de règlement avant validation du paiement."
    },
    {
      heading: "6. Documents de voyage et identité",
      body: "Vous êtes responsable de l'exactitude des noms et des numéros de pièces d'identité fournis. Un billet émis au mauvais nom ne peut généralement pas être corrigé sans frais de la compagnie, et ces frais restent à votre charge."
    },
    {
      heading: "7. Données personnelles",
      body: "Les numéros de passeport et de pièce d'identité sont conservés sous forme chiffrée et supprimés automatiquement 90 jours après la fin du voyage. Voir notre politique de confidentialité pour le détail."
    }
  ],
  en: [
    {
      heading: "1. Bookings are final",
      body: "All bookings made on this platform are final. No refund is granted, for any reason, once payment has been collected. This condition is shown on the offer page, in the price summary and at the payment step, and your acceptance is recorded against your booking."
    },
    {
      heading: "2. Cancellation without refund",
      body: "You may ask us to cancel a booking by contacting customer service. Cancelling releases the seats or rooms concerned, but gives no right to any refund, whole or partial, and no credit note."
    },
    {
      heading: "3. Bookings paid in cash",
      body: "A cash booking is held for 48 hours. If payment is not made before the stated deadline, the booking is cancelled automatically and the stock returns to sale. Nothing is owed by either side in that case."
    },
    {
      heading: "4. When we cannot deliver",
      body: "If an airline cancels a flight, a hotel does not honour a confirmed booking, or we cannot supply what was sold, contact us immediately. These situations are handled case by case by management and fall outside the no-refund policy above."
    },
    {
      heading: "5. Prices and currencies",
      body: "Prices are set in US dollars. Display in Congolese francs or euros is a conversion at our own rate, locked at the moment you order. The amount actually charged is shown to you in the settlement currency before you confirm payment."
    },
    {
      heading: "6. Travel documents and identity",
      body: "You are responsible for the accuracy of the names and document numbers you provide. A ticket issued in the wrong name usually cannot be corrected without an airline fee, and that fee remains yours to pay."
    },
    {
      heading: "7. Personal data",
      body: "Passport and ID numbers are stored encrypted and deleted automatically 90 days after travel ends. See our privacy policy for detail."
    }
  ],
  pt: [],
  es: []
};
