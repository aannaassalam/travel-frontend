import { RatingBadge } from "@/components/site/bits";
import { TextAreaField } from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import {
  getMyReview,
  getReviews,
  MAX_REVIEW_COMMENT,
  postReview,
  type OwnReview,
  type ReviewTarget
} from "@/lib/reviews";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

/**
 * Customer reviews of a listing, hotel or restaurant: the approved ones, and
 * the signed-in customer's own, written here. Nothing is shown that a customer
 * did not write — what a review says reaches the page only once the office has
 * approved it, and the rating above it is made of those reviews alone.
 */

const STATUS_TONE: Record<OwnReview["status"], string> = {
  PENDING: "bg-warn-100 text-warn-600",
  APPROVED: "bg-ok-100 text-ok-600",
  REJECTED: "bg-ink-50 text-ink-500"
};

/** Stars as a picture, the number said once for a screen reader. */
function StarRow({ n, label, className }: { n: number; label: string; className?: string }) {
  return (
    <span role="img" aria-label={label} className={cn("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn("size-4", i <= n ? "fill-accent-500 text-accent-500" : "text-ink-200")}
        />
      ))}
    </span>
  );
}

/**
 * Keyed on the item: Next keeps a page mounted from one hotel (or car) to the
 * next one linked under it, and a half-written review, an open edit or a
 * "thank you" must not follow the customer there.
 */
export default function Reviews(props: { targetType: ReviewTarget; target: string }) {
  return <ReviewsOf key={`${props.targetType}:${props.target}`} {...props} />;
}

function ReviewsOf({ targetType, target }: { targetType: ReviewTarget; target: string }) {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { customer, signedIn, isPending: sessionPending } = useSession();
  const starsLabel = (n: number) => t(n === 1 ? "reviews.star" : "reviews.stars", { n });

  const { data } = useQuery({
    queryKey: ["reviews", targetType, target],
    queryFn: () => getReviews(targetType, target),
    staleTime: 60_000
  });
  // Keyed on who is signed in: whoever signs in next on this browser must not
  // be shown the previous customer's review.
  const mineKey = ["my-review", customer?.phone, targetType, target];
  const mine = useQuery({
    queryKey: mineKey,
    queryFn: () => getMyReview(targetType, target),
    enabled: signedIn
  });

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Called directly, as LeadForm does, not through useMutation: the global
  // mutation handler would add an English toast on top of the error shown here.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError(t("reviews.pickRating"));
    setError("");
    setBusy(true);
    try {
      const review = await postReview({
        targetType,
        target,
        rating,
        comment: comment.trim() || undefined,
        locale
      });
      qc.setQueryData(mineKey, review);
      setEditing(false);
      setSent(true);
    } catch (err) {
      // A session that ended meanwhile: the section turns into "sign in".
      if (err instanceof ApiError && err.status === 401) qc.invalidateQueries({ queryKey: ["session"] });
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const edit = (r: OwnReview) => {
    setRating(r.rating);
    setComment(r.comment ?? "");
    setError("");
    setSent(false);
    setEditing(true);
  };

  const items = data?.items ?? [];
  const own = mine.data;
  // Back to this section after signing in, not to the top of the page.
  const signInHref = `/login?next=${encodeURIComponent(`${router.asPath.split("#")[0]}#reviews`)}`;

  return (
    <section id="reviews" aria-labelledby="reviews-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 id="reviews-heading" className="text-xl font-bold text-brand-900">
          {t("reviews.title")}
        </h2>
        {data?.count ? <RatingBadge rating={data.rating} count={data.count} /> : null}
      </div>

      {items.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((r) => (
            <li key={r.id} className="surface flex flex-col p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StarRow n={r.rating} label={starsLabel(r.rating)} />
                {r.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-ok-100 px-2 py-0.5 text-[11px] font-semibold text-ok-600">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    {t("reviews.verified")}
                  </span>
                ) : null}
              </div>
              {r.comment ? (
                <p className="mt-3 flex-1 whitespace-pre-line wrap-break-word text-sm leading-relaxed text-ink-700">
                  {r.comment}
                </p>
              ) : null}
              <footer className="mt-4 flex items-center gap-3 border-t border-ink-100/70 pt-3">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white"
                >
                  {r.authorName.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">{r.authorName}</span>
                  <span className="block text-xs text-ink-500">{fmtDate(r.createdAt, locale)}</span>
                </span>
              </footer>
            </li>
          ))}
        </ul>
      ) : data ? (
        <p className="text-sm text-ink-500">{t("listing.noReviews")}</p>
      ) : null}
      {data && data.total > items.length ? (
        <p className="mt-3 text-xs text-ink-500">
          {t("reviews.latest", { n: items.length, total: data.total })}
        </p>
      ) : null}

      {/* Nothing until the session is known: a signed-in customer should not
          see "sign in" flash past, and the server render has no session. */}
      <div className="mt-6">
        {sessionPending ? null : !signedIn ? (
          <Link href={signInHref} className="btn btn-md btn-outline">
            {t("reviews.signIn")}
          </Link>
        ) : mine.isPending ? null : own && !editing ? (
          <div className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-brand-900">{t("reviews.yours")}</h3>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                  STATUS_TONE[own.status]
                )}
              >
                {t(`reviews.status.${own.status}`)}
              </span>
            </div>
            <StarRow n={own.rating} label={starsLabel(own.rating)} className="mt-3" />
            {own.comment ? (
              <p className="mt-2 whitespace-pre-line wrap-break-word text-sm text-ink-700">{own.comment}</p>
            ) : null}
            {sent ? (
              <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium text-ok-600">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                {t("reviews.thanks")}
              </p>
            ) : null}
            <button type="button" className="btn btn-sm btn-outline mt-4" onClick={() => edit(own)}>
              {t("reviews.editCta")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="surface space-y-4 p-5">
            <h3 className="font-bold text-brand-900">{t(own ? "reviews.edit" : "reviews.write")}</h3>
            {/* Native radios: arrow keys move between the stars, Tab leaves them. */}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink-700">{t("reviews.yourRating")}</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`review-rating-${target}`}
                      value={n}
                      checked={rating === n}
                      onChange={() => {
                        setRating(n);
                        setError("");
                      }}
                      className="peer sr-only"
                    />
                    <Star
                      aria-hidden="true"
                      className={cn(
                        "size-10 rounded-md p-1 transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-500",
                        n <= rating ? "fill-accent-500 text-accent-500" : "text-ink-300 hover:text-accent-500"
                      )}
                    />
                    <span className="sr-only">{starsLabel(n)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <TextAreaField
              label={t("reviews.comment")}
              value={comment}
              maxLength={MAX_REVIEW_COMMENT}
              onChange={(e) => setComment(e.target.value)}
              helper={`${comment.length} / ${MAX_REVIEW_COMMENT}`}
            />
            {error ? (
              <p role="alert" className="text-sm font-medium text-bad-600">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="btn btn-md btn-primary"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {t("reviews.submit")}
              </button>
              {editing ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                  onClick={() => setEditing(false)}
                >
                  {t("common.cancel")}
                </button>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
