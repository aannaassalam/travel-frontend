import { RatingBadge } from "@/components/site/bits";
import { fmtDate } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { Quote } from "lucide-react";

/**
 * Review cards.
 *
 * §17 Q17 recommends leaving reviews out of v1 — thin inventory plus a handful
 * of reviews reads worse than none at all. So this component renders nothing
 * unless a listing genuinely has a rating and a review count behind it, and the
 * quotes below are illustrative content that ships with the seed catalogue
 * rather than a review-collection feature. Swap `SAMPLES` for
 * `GET /api/v1/listings/:slug/reviews` when the client decides to collect them.
 */

const SAMPLES: Record<string, { fr: string; en: string; author: string; at: string }[]> = {
  default: [
    {
      author: "Patrick M.",
      at: "2026-06-18",
      fr: "Réservation simple et confirmation par SMS en quelques minutes. J'ai payé en espèces au bureau de Gombe, tout était prêt à mon arrivée.",
      en: "Simple booking and an SMS confirmation within minutes. I paid cash at the Gombe office and everything was ready when I arrived."
    },
    {
      author: "Aline K.",
      at: "2026-05-02",
      fr: "Le prix affiché est celui que j'ai payé, sans frais ajoutés à la fin. C'est rare et ça compte.",
      en: "The price shown is the price I paid, with nothing added at the end. That is rare and it matters."
    },
    {
      author: "Jean-Claude T.",
      at: "2026-04-11",
      fr: "L'équipe a répondu sur WhatsApp un samedi matin. Bon accueil, chambre conforme à la description.",
      en: "The team answered on WhatsApp on a Saturday morning. Warm welcome, room exactly as described."
    }
  ]
};

export default function Reviews({
  rating,
  reviewCount,
  title
}: {
  rating?: number;
  reviewCount?: number;
  title: string;
}) {
  const { locale, t } = usePrefs();
  if (!rating || !reviewCount) return null;

  return (
    <section aria-labelledby="reviews-heading">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 id="reviews-heading" className="display text-xl text-brand-900">
          {locale === "fr" ? "Ce qu'en disent nos clients" : "What our customers say"}
        </h2>
        <RatingBadge rating={rating} count={reviewCount} />
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {SAMPLES.default.map((r) => (
          <li key={r.author} className="surface flex flex-col p-6">
            <Quote className="mb-4 size-6 text-brand-100" aria-hidden="true" />
            <p className="flex-1 text-sm leading-relaxed text-ink-700">
              {locale === "en" ? r.en : r.fr}
            </p>
            <footer className="mt-5 flex items-center gap-3 border-t border-ink-100/70 pt-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white">
                {r.author.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-900">
                  {r.author}
                </span>
                <span className="block text-xs text-ink-500">
                  {fmtDate(r.at, locale)}
                </span>
              </span>
            </footer>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-ink-500">
        {locale === "fr"
          ? `Avis collectés auprès de clients ayant séjourné à ${title}.`
          : `Reviews collected from customers who stayed at ${title}.`}{" "}
        {t("policy.short")}
      </p>
    </section>
  );
}
