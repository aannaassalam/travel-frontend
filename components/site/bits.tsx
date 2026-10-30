import { fmtDayMonth } from "@/lib/format";
import { baseMinor, formatMoney, resolve, settlementNote } from "@/lib/money";
import { BASE_CURRENCY, Currency, Money, PromotedItem, Promotion } from "@/typescript/interface/domain.interface";
import { usePrefs } from "@/lib/prefs";
import { usePolicyNotice, usePolicyShort, usePolicyTitle } from "@/lib/siteContent";
import { cn } from "@/lib/utils";
import { ChevronRight, Info, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

/** Small shared pieces. One file so they are one import, not seven. */

/**
 * A price in the visitor's currency, exactly as the API sent it — or in francs,
 * the currency it was entered in, when the API sent none in theirs. Never a
 * conversion made here: presenting a derived number as if it were the charge
 * is precisely the ambiguity §5 warns generates disputes.
 *
 * `charged`: an order's figure, in the currency the order was charged in and
 * not the one picked since — with the francs beside it when that is another
 * currency: "60 $US (171 000 FC)".
 */
export function Price({
  money,
  className,
  suffix,
  charged
}: {
  money: Money | number | undefined;
  className?: string;
  suffix?: string;
  charged?: Currency;
}) {
  const { currency, locale } = usePrefs();
  const shown = resolve(money, charged ?? currency);
  return (
    <span className={cn("tnum", className)}>
      {formatMoney(shown.minor, shown.currency, locale)}
      {charged && shown.currency !== BASE_CURRENCY ? (
        <span className="text-sm font-normal text-ink-500">
          {" "}
          ({formatMoney(baseMinor(money), BASE_CURRENCY, locale)})
        </span>
      ) : null}
      {suffix ? <span className="text-sm font-normal text-ink-500"> {suffix}</span> : null}
    </span>
  );
}

/**
 * A promotion's old price, struck through, and its discount: "300 000 FC −20 %",
 * set beside the price that is charged. Small and grey with a red badge — not
 * the sold-out look, where the price itself is struck out. Inline, so it
 * follows the text alignment of the price block it sits in. Grey at ink-500,
 * not lighter: 4.5:1 on the price rail, as small text needs (WCAG AA).
 * The old price is text-sm; a `text-xs` className sets it beside a small price.
 */
export function PromoWas({ promotion, className }: { promotion?: Promotion; className?: string }) {
  const { t } = usePrefs();
  if (!promotion) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 text-sm", className)}>
      <span className="sr-only">{t("promo.was")}</span>
      <Price money={promotion.compareAtPrice} className="text-ink-500 line-through" />
      <span className="rounded bg-bad-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
        {t("promo.off", { n: promotion.discountPercent })}
      </span>
    </span>
  );
}

/** "Jusqu'au 30 nov.": a promotion's last day, when it has one. */
export function PromoEnds({ promotion, className }: { promotion?: Pick<Promotion, "endsAt">; className?: string }) {
  const { t, locale } = usePrefs();
  const day = promotion?.endsAt ? fmtDayMonth(promotion.endsAt, locale) : "";
  if (!day) return null;
  return (
    <p className={cn("mt-1 text-xs font-semibold text-bad-600", className)}>
      {t("promo.until", { date: day })}
    </p>
  );
}

/**
 * A hotel's or restaurant's card: its best promotion, on which room or dish —
 * "Suite 120 000 FC 150 000 FC −20 %", and its last day.
 */
export function PromoItem({ promotion, className }: { promotion?: PromotedItem; className?: string }) {
  const { lz } = usePrefs();
  if (!promotion) return null;
  return (
    <div className={cn("text-sm", className)}>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="font-semibold text-ink-900">{lz(promotion.name)}</span>
        <Price money={promotion.price} className="font-bold text-brand-900" />
        <PromoWas promotion={promotion} />
      </p>
      <PromoEnds promotion={promotion} className="mt-0.5" />
    </div>
  );
}

/**
 * Whether there is a real price to show.
 *
 * A zero is not a price, it is a missing one — and "from $0" on a hotel is not
 * a bargain, it is a broken promise on the one surface where the number is the
 * whole point. Callers that show a "from" figure must gate on this: the API can
 * legitimately return 0 when a listing has no bookable inventory priced yet.
 */
export function hasPrice(money: Money | number | undefined): boolean {
  if (money === undefined || money === null) return false;
  if (typeof money === "number") return money > 0;
  return Object.values(money).some((v) => typeof v === "number" && v > 0);
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
  // Customers' own ratings now, which can be low: below 3.5 the number speaks
  // for itself rather than being called "Good".
  const label =
    rating >= 4.5
      ? locale === "fr" ? "Exceptionnel" : "Exceptional"
      : rating >= 4.2
        ? locale === "fr" ? "Très bien" : "Very good"
        : rating >= 3.5
          ? locale === "fr" ? "Bien" : "Good"
          : "";
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
        {label ? <strong className="block font-semibold text-ink-900">{label}</strong> : null}
        {count ? t(count === 1 ? "listing.reviewOne" : "listing.reviews", { n: count }) : ""}
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
  /** Absent when the stock is not counted (rooms, bus and flight seats): nothing to say. */
  available?: number;
  noun?: "seat" | "room" | "unit";
}) {
  const { t } = usePrefs();
  if (available === undefined) return null;
  if (available <= 0) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-md bg-ink-50 px-2 py-1 text-[11px] font-bold whitespace-nowrap uppercase tracking-wide text-ink-500 ring-1 ring-ink-100 ring-inset">
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
    /*
      `shrink-0` and `whitespace-nowrap` together, because this badge always
      sits beside a price. A CDF amount is seven digits wide, which took the
      whole row and squeezed the badge down to one word per line - "4 / seats /
      left" stacked into the card's edge. A badge is a label; it either fits on
      its line or wraps onto the next one whole.
    */
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-bad-100 px-2 py-1 text-[11px] font-bold whitespace-nowrap text-bad-600 ring-1 ring-bad-600/15 ring-inset">
      <span className="size-1.5 rounded-full bg-bad-600" aria-hidden="true" />
      {t(key, { n: available })}
    </span>
  );
}

/** §2.2(3): surfaced on the listing page, the price summary and the payment step. */
export function PolicyLine({ className }: { className?: string }) {
  const { t } = usePrefs();
  const notice = usePolicyNotice();
  const title = usePolicyTitle();
  return (
    <p className={cn("flex items-start gap-2 text-sm text-ink-700", className)}>
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
      <span>
        <strong className="font-semibold">{title}</strong> — {notice}{" "}
        <Link href="/terms#cancellation" className="font-medium text-brand-500 underline">
          {t("policy.readFull")}
        </Link>
      </span>
    </p>
  );
}

export function PolicyChip() {
  const short = usePolicyShort();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-50 px-2 py-1 text-[11px] font-semibold text-ink-500 ring-1 ring-ink-100 ring-inset">
      <Info className="size-3 text-brand-500" />
      {short}
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
  title,
  subtitle,
  href,
  cta
}: {
  title: string;
  subtitle?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
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
