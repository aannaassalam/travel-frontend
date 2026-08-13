import { isApproximate, price as fmtPrice, settlementNote } from "@/lib/money";
import { Money } from "@/typescript/interface/domain.interface";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { ChevronRight, Info, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

/** Small shared pieces. One file so they are one import, not seven. */

/**
 * A price in the visitor's currency.
 *
 * When the administrator has typed a price in that currency it is shown
 * exactly. When they have not, the figure is converted from the USD base and
 * prefixed with ≈ — because presenting a derived number as if it were the
 * charge is precisely the ambiguity §5 warns generates disputes.
 */
export function Price({
  money,
  className,
  suffix
}: {
  money: Money | number | undefined;
  className?: string;
  suffix?: string;
}) {
  const { currency, locale } = usePrefs();
  const approx = isApproximate(money, currency);
  return (
    <span
      className={cn("tnum", className)}
      title={approx ? (locale === "fr" ? "Prix converti, à titre indicatif" : "Converted price, indicative") : undefined}
    >
      {fmtPrice(money, currency, locale)}
      {suffix ? <span className="text-sm font-normal text-ink-500"> {suffix}</span> : null}
    </span>
  );
}

/** §5: never leave the settlement currency ambiguous — that is what disputes are made of. */
export function SettlementNote({ money }: { money: Money | number | undefined }) {
  const { currency, locale } = usePrefs();
  const note = settlementNote(money, currency, locale);
  if (!note) return null;
  return (
    <p className="text-xs text-ink-500">
      {locale === "fr" ? "Vous serez débité de " : "You will be charged "}
      <strong className="font-semibold text-ink-700">{note}</strong>
    </p>
  );
}

export function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${n} étoiles`}>
      {Array.from({ length: n }, (_, i) => (
        <Star key={i} className="size-3.5 fill-accent-500 text-accent-500" aria-hidden="true" />
      ))}
    </span>
  );
}

export function RatingBadge({
  rating,
  count,
  size = "md"
}: {
  rating?: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const { t, locale } = usePrefs();
  if (!rating) {
    return <span className="text-xs text-ink-500">{t("listing.noReviews")}</span>;
  }
  const label =
    rating >= 4.5
      ? locale === "fr" ? "Exceptionnel" : "Exceptional"
      : rating >= 4.2
        ? locale === "fr" ? "Très bien" : "Very good"
        : locale === "fr" ? "Bien" : "Good";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "tnum rounded-lg rounded-bl-sm bg-brand-900 font-bold text-white shadow-xs",
          size === "sm" ? "px-1.5 py-1 text-xs" : "px-2.5 py-1.5 text-sm"
        )}
      >
        {rating.toFixed(1)}
      </span>
      <span className="text-xs leading-tight text-ink-500">
        <strong className="block font-semibold text-ink-900">{label}</strong>
        {count ? t("listing.reviews", { n: count }) : ""}
      </span>
    </span>
  );
}

/**
 * §11.6: where scarcity is genuine, state it once, plainly. There is no
 * "booked 8 times today" anywhere in this codebase and there must never be —
 * a customer who feels pressured into an unrefundable purchase is exactly the
 * customer who files a chargeback.
 */
export function Scarcity({
  available,
  noun = "unit"
}: {
  available: number;
  noun?: "seat" | "room" | "unit";
}) {
  const { t } = usePrefs();
  if (available <= 0) {
    return (
      <span className="inline-flex items-center rounded-md bg-ink-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-500 ring-1 ring-ink-100 ring-inset">
        {t("listing.soldOut")}
      </span>
    );
  }
  if (available > 5) return null;
  const key =
    noun === "seat"
      ? "listing.seatsLeft"
      : noun === "room"
        ? "listing.roomsLeft"
        : "listing.unitsLeft";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-bad-100 px-2 py-1 text-[11px] font-bold text-bad-600 ring-1 ring-bad-600/15 ring-inset">
      <span className="size-1.5 rounded-full bg-bad-600" aria-hidden="true" />
      {t(key, { n: available })}
    </span>
  );
}

/** §2.2(3): surfaced on the listing page, the price summary and the payment step. */
export function PolicyLine({ className }: { className?: string }) {
  const { t } = usePrefs();
  return (
    <p className={cn("flex items-start gap-2 text-sm text-ink-700", className)}>
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
      <span>
        <strong className="font-semibold">{t("policy.title")}</strong> — {t("policy.body")}{" "}
        <Link href="/terms#no-refund" className="font-medium text-brand-500 underline">
          {t("policy.readFull")}
        </Link>
      </span>
    </p>
  );
}

export function PolicyChip() {
  const { t } = usePrefs();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-500 ring-1 ring-ink-100 ring-inset">
      <Info className="size-3 text-brand-500" />
      {t("policy.short")}
    </span>
  );
}

/**
 * Section header: tracked eyebrow, serif display headline, supporting line,
 * and an optional link that sits on the baseline of the headline. Every
 * section on the site uses this, which is what makes the page feel composed
 * rather than assembled.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
  cta
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="eyebrow mb-2 flex items-center gap-2 text-brand-500">
            <span className="h-px w-6 bg-accent-500" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h2 className="display text-[26px] leading-[1.15] text-brand-900 sm:text-[34px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{subtitle}</p>
        )}
      </div>
      {href && cta && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-900"
        >
          {cta}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-500 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink-700">{item.label}</span>
            )}
            {i < items.length - 1 && <ChevronRight className="size-3.5" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
