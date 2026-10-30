import { NoImageSpot } from "@/components/art/spots";
import {
  Price,
  PolicyChip,
  PromoEnds,
  PromoWas,
  RatingBadge,
  Scarcity,
  Stars,
  hasPrice
} from "@/components/site/bits";
import { carTypeLabel, detailHref, hotelHref, propertySizes, sqm } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media";
import { formatMoney, resolve } from "@/lib/money";
import { fmtDateLong, formatMinutes } from "@/lib/format";
import { facetLabel } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { rateLabel, ratesOf } from "@/lib/rental";
import { usePolicyShort } from "@/lib/siteContent";
import { arrivalOf, bookableTimesOn, timetableLines } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  Hotel,
  Listing,
  ListingAttributes,
  Money,
  Promotion,
  Vertical
} from "@/typescript/interface/domain.interface";
import {
  ArrowRight,
  Bed,
  Building2,
  Clock,
  Gauge,
  MapPin,
  Maximize,
  Plane,
  Ruler,
  Settings2,
  UserRound
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

/** Per-vertical chip tint. Amber stays reserved for calls to action. */
const VERTICAL_COLOR: Record<string, string> = {
  FLIGHT: "var(--color-v-flight)",
  HOTEL: "var(--color-v-hotel)",
  BUS: "var(--color-v-bus)",
  CAR: "var(--color-v-car)",
  ACTIVITY: "var(--color-v-activity)",
  PROPERTY: "var(--color-v-property)"
};

export function VerticalChip({
  vertical,
  label,
  Icon
}: {
  vertical: string;
  label: string;
  Icon?: typeof Plane;
}) {
  // A route with no agency, a car with no type: no chip rather than a blank pill.
  if (!label) return null;
  return (
    <span className="chip" style={{ ["--chip-color" as string]: VERTICAL_COLOR[vertical] }}>
      {Icon && <Icon className="size-3" />}
      {label}
    </span>
  );
}

/** The `card.kind.*` keys: a typo fails to compile instead of showing the raw key. */
type Kind = Exclude<Vertical, "PROPERTY"> | "PROPERTY_SALE" | "PROPERTY_RENT";

/**
 * What the card sells ("Billet d'avion"), the first line of its text. In the
 * chip's own text colour: the raw car tint is under 4.5:1 at 11px on white.
 */
export function CardKind({ kind }: { kind: Kind }) {
  const { t } = usePrefs();
  // PROPERTY_SALE/_RENT take the property tint; no tint (restaurant) = brand.
  const tint = VERTICAL_COLOR[kind.split("_")[0]] ?? "var(--color-brand-500)";
  return (
    <p
      className="eyebrow"
      style={{ color: `color-mix(in oklab, ${tint} 88%, black)` }}
    >
      {t(`card.kind.${kind}`)}
    </p>
  );
}

/** A listing's `card.kind.*`: property is a sale or a rental. */
function cardKind(listing: Listing): Kind {
  if (listing.vertical !== "PROPERTY") return listing.vertical;
  const a = listing.attributes;
  return a.priceBasis === "PER_MONTH" || a.propertyType?.endsWith("_RENT")
    ? "PROPERTY_RENT"
    : "PROPERTY_SALE";
}

/**
 * Result cards.
 *
 * The dense, scannable row — image left, detail centre, price rail right — is
 * the pattern Booking.com and Expedia trained the market on. §11.6: take the
 * layout, leave the manipulation. No "booked 8 times today", no fake struck
 * -through prices (a promotion's is the old price the office typed), no
 * countdown that resets on reload.
 */

const SHELL =
  "group relative flex flex-col overflow-hidden surface card-lift sm:flex-row";
const TILE =
  "group relative flex flex-col overflow-hidden surface card-lift";

function Thumb({
  src,
  alt,
  className,
  priority
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const { lowData } = usePrefs();
  /**
   * `mediaUrl` covers a MISSING image; this covers one that fails to arrive —
   * a dead S3 object, a storage hiccup, a bad migration. Without it next/image
   * leaves the box empty, and a grid of blank grey rectangles reads as broken
   * software rather than as a listing without a photo.
   */
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-ink-50", className)}>
      {lowData ? (
        <div className="size-full bg-linear-to-br from-brand-100 to-brand-500/30" aria-hidden />
      ) : failed ? (
        <div className="grid size-full place-items-center bg-brand-50">
          <NoImageSpot className="w-2/3 max-w-[160px] text-brand-900" />
        </div>
      ) : (
        <>
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            priority={priority}
            onError={() => setFailed(true)}
          />
          {/* A whisper of a scrim so the image edge never fights the card edge. */}
          <div
            className="absolute inset-0 bg-linear-to-t from-brand-900/20 via-transparent to-transparent"
            aria-hidden
          />
        </>
      )}
    </div>
  );
}

/** The price rail every row shares, so the CTA sits in the same place always. */
function PriceRail({
  money,
  suffix,
  promotion,
  rates,
  href,
  cta,
  available,
  noun,
  soldOutCta
}: {
  money?: Money | number;
  suffix?: string;
  promotion?: Promotion;
  /** A car's rates, in place of the one "from" price. */
  rates?: React.ReactNode;
  href: string;
  cta: string;
  /** Absent when the stock is not counted: never sold out. */
  available?: number;
  noun?: "seat" | "room" | "unit";
  soldOutCta?: string;
}) {
  const { t } = usePrefs();
  const soldOut = available !== undefined && available <= 0;
  return (
    <div className="flex shrink-0 flex-col justify-end gap-3 bg-ink-50/60 p-5 sm:w-60 sm:text-right">
      {/* A car's rate list takes the row on a phone, its stock badge below. */}
      <div
        className={cn(
          "flex gap-2 sm:flex-col sm:items-end",
          rates ? "flex-col items-start" : "items-center justify-between"
        )}
      >
        {rates ?? (
          <div>
            <p className="eyebrow text-ink-300">{t("listing.from")}</p>
            <PromoWas promotion={promotion} />
            <Price
              money={money}
              className="display block text-[28px] leading-none text-brand-900"
            />
            {suffix && <p className="mt-1 text-xs text-ink-500">{suffix}</p>}
            <PromoEnds promotion={promotion} />
          </div>
        )}
        <Scarcity available={available} noun={noun} />
      </div>
      <Link
        href={soldOut ? `${href}#request` : href}
        className={cn("btn btn-md w-full", soldOut ? "btn-outline" : "btn-primary")}
      >
        {soldOut ? (soldOutCta ?? t("empty.cta")) : cta}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------- bus and flight row */

/** The searched day if the search had one, its departures still to come, and a link that carries the day on. */
function useSearchedDay(listing: Listing) {
  const router = useRouter();
  const raw = router.query.from;
  const day = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
  return {
    day,
    times: day ? bookableTimesOn(listing.attributes, day) : [],
    href: `${detailHref(listing)}${day ? `?date=${day}` : ""}`
  };
}

/**
 * A route's week on a card, a line a day, Monday first — "Lun 07:30 · 08:00" —
 * or one "Tous les jours" line for a bus. Compact: the detail page has the table.
 * A row a line, white and grey in turn, so a long week reads across.
 */
function Timetable({ a }: { a: ListingAttributes }) {
  const { t, locale } = usePrefs();
  const lines = timetableLines(a, locale);
  if (!lines.length) return null;
  return (
    <div className="flex gap-1.5 text-sm text-ink-700">
      <span className="shrink-0 py-1 font-semibold">{t("route.times")} :</span>
      {/* An outer ring: an inset one would be painted over by the rows. */}
      <ul className="min-w-0 flex-1 overflow-hidden rounded-md ring-1 ring-ink-100">
        {lines.map((line) => (
          <li key={line} className="px-2 py-1 odd:bg-white even:bg-ink-50">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A bus or flight route: the agency, the two ends, and its departures — the
 * searched day's when the search had a date (the link carries the day on to
 * the booking box), otherwise its timetable.
 */
export function RouteRow({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const a = listing.attributes;
  const { day, times, href } = useSearchedDay(listing);
  const isFlight = listing.vertical === "FLIGHT";

  return (
    <article className={SHELL}>
      <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="h-44 sm:h-auto sm:w-60" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <CardKind kind={cardKind(listing)} />
        <div className="flex flex-wrap items-center gap-2">
          <VerticalChip
            vertical={listing.vertical}
            label={a.operator ?? ""}
            Icon={isFlight ? Plane : undefined}
          />
          {a.vehicleClass ? (
            <span className="rounded bg-ink-50 px-2 py-1 text-xs font-medium text-ink-700">
              {a.vehicleClass}
            </span>
          ) : null}
          {isFlight && a.cabin ? (
            <span className="rounded bg-ink-50 px-2 py-1 text-xs font-medium text-ink-700">
              {t(`cabin.${a.cabin}`)}
            </span>
          ) : null}
          <PolicyChip />
        </div>
        <h3 className="text-lg font-bold text-brand-900">
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {listing.city} → {a.destination}
          </Link>
        </h3>
        {a.durationMinutes ? (
          <p className="flex items-center gap-1.5 text-sm text-ink-500">
            <Clock className="size-3.5" />
            {formatMinutes(a.durationMinutes, locale)}
          </p>
        ) : null}
        {day ? (
          times.length ? (
            <div>
              <p className="mb-1.5 text-xs text-ink-500">{fmtDateLong(`${day}T12:00:00`, locale)}</p>
              <ul className="flex flex-wrap gap-1.5">
                {times.map((time) => (
                  <li
                    key={time}
                    className="rounded-md bg-brand-50 px-2.5 py-1 font-mono text-sm font-bold text-brand-900"
                    title={arrivalOf(time, a.durationMinutes) ? t("route.arrives", { time: arrivalOf(time, a.durationMinutes)! }) : undefined}
                  >
                    {time}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-500">{t("route.noDeparture")}</p>
              <Timetable a={a} />
            </>
          )
        ) : (
          <Timetable a={a} />
        )}
        {a.routeStops?.length ? (
          <p className="line-clamp-1 text-sm text-ink-500">
            {t("listing.stops")} : {a.routeStops.join(" → ")}
          </p>
        ) : null}
        <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
      </div>
      <PriceRail
        money={listing.sellPrice}
        suffix={`${t("listing.perPerson")} · ${t("route.adult").toLowerCase()}`}
        promotion={listing.promotion}
        href={href}
        cta={t("listing.select")}
        noun="seat"
      />
    </article>
  );
}

/* ------------------------------------------------------------------ car row */

export function CarRow({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const a = listing.attributes;
  return (
    <article className={SHELL}>
      <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="h-44 sm:h-auto sm:w-60" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <CardKind kind={cardKind(listing)} />
        <div className="flex flex-wrap items-center gap-2">
          <VerticalChip vertical="CAR" label={a.category ? carTypeLabel(locale, a.category) : ""} />
          {a.withDriver && (
            <span className="chip" style={{ ["--chip-color" as string]: "var(--color-teal-600)" }}>
              {t("car.driverIncluded")}
            </span>
          )}
          <PolicyChip />
        </div>
        <h3 className="text-lg font-bold text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0 hover:underline">
            {lz(listing.title)}
          </Link>
        </h3>
        <CarCompany a={a} />
        {/* Only what the office filled in: an empty line, or "Manual" for a
            gearbox nobody gave, says something untrue. */}
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-700">
          {a.transmission && (
            <li className="flex items-center gap-1.5">
              <Settings2 className="size-4 text-ink-500" />
              {a.transmission === "AUTOMATIC"
                ? locale === "fr" ? "Automatique" : "Automatic"
                : locale === "fr" ? "Manuelle" : "Manual"}
            </li>
          )}
          {a.mileageLimit && (
            <li className="flex items-center gap-1.5">
              <Gauge className="size-4 text-ink-500" />
              {a.mileageLimit}
            </li>
          )}
          {a.pickupLocations?.[0] && (
            <li className="flex items-center gap-1.5">
              <MapPin className="size-4 text-ink-500" />
              {a.pickupLocations[0]}
            </li>
          )}
        </ul>
        <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
      </div>
      <PriceRail
        rates={<CarRates listing={listing} className="w-full min-w-0" />}
        href={detailHref(listing)}
        cta={t("listing.select")}
        available={listing.available}
      />
    </article>
  );
}

/** A car's rental company — its supplier, named as a route names its agency. */
function CarCompany({ a }: { a: ListingAttributes }) {
  const { t } = usePrefs();
  if (!a.operator) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-brand-500">
      <Building2 className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{t("car.company")} : </span>
      {a.operator}
    </p>
  );
}

/**
 * Every rate a car is offered at, shortest first, label left and price right:
 * "Par heure", "Pour 6 heures"… The 24-hour one is its `sellPrice`, so that is
 * the line a promotion's old price goes on.
 */
function CarRates({ listing, className }: { listing: Listing; className?: string }) {
  const { t } = usePrefs();
  return (
    <div className={className}>
      <dl className="space-y-1">
        {ratesOf(listing).map((r) => (
          <div key={r.hours} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-sm text-ink-500">{rateLabel(r.hours, t)}</dt>
            <dd className="ml-auto text-right">
              {r.hours === 24 && <PromoWas promotion={listing.promotion} className="mr-1.5" />}
              <Price money={r.price} className="text-[15px] font-bold text-brand-900" />
            </dd>
          </div>
        ))}
      </dl>
      <PromoEnds promotion={listing.promotion} className="text-right" />
    </div>
  );
}

/* ------------------------------------------------------------- activity row */

export function ActivityRow({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const a = listing.attributes;
  return (
    <article className={SHELL}>
      <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="h-52 sm:h-auto sm:w-64" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <CardKind kind={cardKind(listing)} />
        <VerticalChip vertical="ACTIVITY" label={listing.city} Icon={MapPin} />
        <h3 className="text-lg font-bold text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0 hover:underline">
            {lz(listing.title)}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-ink-500">{lz(listing.description)}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-700">
          {a.durationMinutes && (
            <li className="flex items-center gap-1.5">
              <Clock className="size-4 text-ink-500" />
              {formatMinutes(a.durationMinutes, locale)}
            </li>
          )}
          {a.maxParticipants && (
            <li className="flex items-center gap-1.5">
              <UserRound className="size-4 text-ink-500" />
              {locale === "fr" ? "Max" : "Max"} {a.maxParticipants}
            </li>
          )}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
          <PolicyChip />
        </div>
      </div>
      <PriceRail
        money={listing.sellPrice}
        suffix={t("listing.perPerson")}
        promotion={listing.promotion}
        href={detailHref(listing)}
        cta={t("listing.book")}
        available={listing.available}
      />
    </article>
  );
}

/* ---------------------------------------------------------------- hotel row */

export function HotelRow({ hotel }: { hotel: Hotel }) {
  const { t, locale, lz } = usePrefs();
  return (
    <article className={SHELL}>
      <Thumb src={mediaUrl(hotel.images[0])} alt={lz(hotel.name)} className="h-52 sm:h-auto sm:w-64" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <CardKind kind="HOTEL" />
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-brand-900">
            <Link href={hotelHref(hotel)} className="after:absolute after:inset-0 hover:underline">
              {lz(hotel.name)}
            </Link>
          </h3>
          <Stars n={hotel.stars} />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-brand-500">
          <MapPin className="size-3.5" />
          {hotel.address}, {hotel.city}
        </p>
        <p className="line-clamp-2 text-sm text-ink-500">{lz(hotel.description)}</p>
        <ul className="flex flex-wrap gap-1.5">
          {hotel.amenities.slice(0, 5).map((a) => (
            <li key={facetLabel(locale, a)} className="rounded bg-ink-50 px-2 py-1 text-xs font-medium text-ink-700">
              {facetLabel(locale, a)}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <RatingBadge rating={hotel.rating} count={hotel.reviewCount} size="sm" />
          <PolicyChip />
        </div>
      </div>
      <PriceRail
        money={hotel.fromPrice}
        suffix={t("listing.perNight")}
        href={hotelHref(hotel)}
        cta={t("listing.details")}
        noun="room"
      />
    </article>
  );
}

/* ------------------------------------------------------------- property row */

export function PropertyRow({ listing }: { listing: Listing }) {
  const { t, locale, lz, currency } = usePrefs();
  const a = listing.attributes;
  // As <Price> shows it, in the visitor's currency.
  const shown = resolve(listing.sellPrice, currency);
  const shownPrice = formatMoney(shown.minor, shown.currency, locale);
  const isRent = a.priceBasis === "PER_MONTH";
  return (
    <article className={SHELL}>
      <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="h-52 sm:h-auto sm:w-64" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <CardKind kind={cardKind(listing)} />
        <div className="flex flex-wrap items-center gap-2">
          <VerticalChip
            vertical="PROPERTY"
            label={PROPERTY_LABEL[a.propertyType ?? "HOUSE_SALE"][locale === "en" ? "en" : "fr"]}
          />
          {a.availabilityStatus === "UNDER_OFFER" && <UnderOffer />}
        </div>
        <h3 className="text-lg font-bold text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0 hover:underline">
            {lz(listing.title)}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-brand-500">
          <MapPin className="size-3.5" />
          {listing.city}
        </p>
        <p className="line-clamp-2 text-sm text-ink-500">{lz(listing.description)}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-700">
          {a.bedrooms ? (
            <li className="flex items-center gap-1.5">
              <Bed className="size-4 text-ink-500" />
              {a.bedrooms} {t("results.bedrooms").toLowerCase()}
            </li>
          ) : null}
          {propertySizes(a).map((s) => (
            <li key={s.kind} className="flex items-center gap-1.5">
              {s.kind === "plot" ? (
                <Ruler className="size-4 text-ink-500" />
              ) : (
                <Maximize className="size-4 text-ink-500" />
              )}
              {sizeText(s, t)}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 flex-col justify-end gap-3 bg-ink-50/60 p-5 sm:w-60 sm:text-right">
        <div>
          <PromoWas promotion={listing.promotion} />
          {/* Nine digits and up ("1 256 850 000 FC") are wider than the
              column at 28 px, and the card's edge cut "FC": a size down. */}
          <Price
            money={listing.sellPrice}
            className={cn(
              "display block leading-none text-brand-900",
              shownPrice.length >= 14 ? "text-[22px]" : "text-[28px]"
            )}
          />
          <p className="mt-1 text-xs text-ink-500">
            {isRent ? t("listing.perMonth") : t("listing.total")}
          </p>
          <PromoEnds promotion={listing.promotion} />
        </div>
        {/* §1.1 archetype C: no checkout for property, ever. */}
        {/* Wraps rather than spill: "Demander des informations" is wider
            than the column's button. */}
        <Link
          href={detailHref(listing)}
          className="btn btn-md btn-dark w-full h-auto! min-h-11 whitespace-normal! py-2.5 text-center leading-tight"
        >
          {t("listing.enquire")}
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      </div>
    </article>
  );
}

/** "320 m²", or "Parcelle 900 m²" for a plot — the one size land has. */
const sizeText = (
  s: ReturnType<typeof propertySizes>[number],
  t: (key: string) => string
) => (s.kind === "plot" ? `${t("property.plot")} ${sqm(s.sqm)}` : sqm(s.sqm));

/** A property with an offer on it: still listed, and said so plainly. */
function UnderOffer({ className }: { className?: string }) {
  const { locale } = usePrefs();
  return (
    <span className={cn("rounded bg-warn-100 px-2 py-1 text-xs font-semibold text-warn-600", className)}>
      {locale === "fr" ? "Sous offre" : "Under offer"}
    </span>
  );
}

export const PROPERTY_LABEL: Record<string, { fr: string; en: string }> = {
  HOUSE_SALE: { fr: "Maison à vendre", en: "House for sale" },
  LAND_SALE: { fr: "Terrain à vendre", en: "Land for sale" },
  APARTMENT_RENT: { fr: "Appartement à louer", en: "Apartment to rent" },
  HOUSE_RENT: { fr: "Maison à louer", en: "House to rent" },
  LAND_RENT: { fr: "Terrain à louer", en: "Land to rent" }
};

/* ------------------------------------------------------------- grid tiles */

/*
 * The tiles draw their image with `Thumb`, like the rows: in the results grid
 * too, low-data mode loads no photos and a photo that fails is not a blank box.
 */

/**
 * The §2.2 reminder a tile has room for: the office's short wording, the same
 * as the rows' badge. Right-aligned, as it may wrap beside a wide price.
 */
function NonRefundable({ className }: { className?: string }) {
  const short = usePolicyShort();
  return <span className={cn("text-right text-[11px] text-ink-300", className)}>{short}</span>;
}

/** Homepage / cross-sell tile, and a car or activity in the results grid. */
export function DealTile({ listing }: { listing: Listing }) {
  const { t, lz } = usePrefs();
  const isCar = listing.vertical === "CAR";
  const suffix = listing.vertical === "HOTEL" ? t("listing.perNight") : t("listing.perPerson");
  return (
    <article className={TILE}>
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-50">
        <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="absolute inset-0" />
        <div
          className="absolute inset-0 bg-linear-to-t from-brand-900/55 via-brand-900/5 to-transparent"
          aria-hidden
        />
        <span className="absolute left-4 top-4 shadow-xs backdrop-blur-sm">
          <VerticalChip vertical={listing.vertical} label={listing.city} />
        </span>
        <div className="absolute bottom-3 right-3">
          <Scarcity
            available={listing.available}
            noun={listing.vertical === "FLIGHT" ? "seat" : "unit"}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <CardKind kind={cardKind(listing)} />
        <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0">
            {lz(listing.title)}
          </Link>
        </h3>
        {isCar && <CarCompany a={listing.attributes} />}
        <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
        {isCar ? (
          <div className="mt-auto space-y-2 pt-3">
            <CarRates listing={listing} />
            <NonRefundable className="block" />
          </div>
        ) : (
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div>
              <p className="eyebrow text-ink-300">{t("listing.from")}</p>
              <PromoWas promotion={listing.promotion} />
              <Price
                money={listing.sellPrice}
                className="display block text-[24px] leading-none text-brand-900"
              />
              <p className="mt-1 text-xs text-ink-500">{suffix}</p>
              <PromoEnds promotion={listing.promotion} />
            </div>
            <NonRefundable />
          </div>
        )}
      </div>
    </article>
  );
}

/** The grid twin of `RouteRow`: agency, the two ends, the day's departures or the timetable, the adult fare. */
export function RouteTile({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const a = listing.attributes;
  const { day, times, href } = useSearchedDay(listing);
  return (
    <article className={TILE}>
      <div className="relative">
        <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="aspect-4/3" />
        <span className="absolute left-4 top-4 shadow-xs backdrop-blur-sm">
          <VerticalChip
            vertical={listing.vertical}
            label={a.operator ?? ""}
            Icon={listing.vertical === "FLIGHT" ? Plane : undefined}
          />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <CardKind kind={cardKind(listing)} />
        <h3 className="text-[17px] font-bold leading-snug text-brand-900">
          <Link href={href} className="after:absolute after:inset-0">
            {listing.city} → {a.destination}
          </Link>
        </h3>
        {day && times.length ? (
          <div>
            <p className="mb-1.5 text-xs text-ink-500">{fmtDateLong(`${day}T12:00:00`, locale)}</p>
            <ul className="flex flex-wrap gap-1.5">
              {times.map((time) => (
                <li
                  key={time}
                  className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-sm font-bold text-brand-900"
                >
                  {time}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {day ? <p className="text-sm text-ink-500">{t("route.noDeparture")}</p> : null}
            <Timetable a={a} />
          </>
        )}
        <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="eyebrow text-ink-300">{t("listing.from")}</p>
            <PromoWas promotion={listing.promotion} />
            <Price
              money={listing.sellPrice}
              className="display block text-[24px] leading-none text-brand-900"
            />
            <p className="mt-1 text-xs text-ink-500">
              {t("listing.perPerson")} · {t("route.adult").toLowerCase()}
            </p>
            <PromoEnds promotion={listing.promotion} />
          </div>
          <NonRefundable />
        </div>
      </div>
    </article>
  );
}

export function HotelTile({ hotel }: { hotel: Hotel }) {
  const { t, lz } = usePrefs();
  return (
    <article className={TILE}>
      <div className="relative aspect-4/3 overflow-hidden bg-ink-50">
        <Thumb src={mediaUrl(hotel.images[0])} alt={lz(hotel.name)} className="absolute inset-0" />
        <div
          className="absolute inset-0 bg-linear-to-t from-brand-900/55 via-brand-900/5 to-transparent"
          aria-hidden
        />
        <span className="absolute left-4 top-4 rounded-md bg-white/95 px-2 py-1 shadow-xs backdrop-blur-sm">
          <Stars n={hotel.stars} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <CardKind kind="HOTEL" />
        <h3 className="text-[17px] font-bold leading-snug text-brand-900">
          <Link href={hotelHref(hotel)} className="after:absolute after:inset-0">
            {lz(hotel.name)}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-ink-500">
          <MapPin className="size-3.5 text-ink-300" />
          {hotel.city}
        </p>
        <RatingBadge rating={hotel.rating} count={hotel.reviewCount} size="sm" />
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          {/*
            No price rather than a wrong one. The related-hotels projection can
            return 0 where no room has been priced for the dates, and "from $0"
            on a hotel card is worse than silence — it is the number the whole
            card is selling.
          */}
          {hasPrice(hotel.fromPrice) ? (
            <div>
              <p className="eyebrow text-ink-300">{t("listing.from")}</p>
              <Price
                money={hotel.fromPrice}
                className="display block text-[24px] leading-none text-brand-900"
              />
              <p className="mt-1 text-xs text-ink-500">{t("listing.perNight")}</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-brand-600">
              {t("listing.details")}
            </p>
          )}
          <NonRefundable />
        </div>
      </div>
    </article>
  );
}

export function PropertyTile({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const a = listing.attributes;
  return (
    <article className={TILE}>
      <div className="relative aspect-4/3 overflow-hidden bg-ink-50">
        <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="absolute inset-0" />
        <div
          className="absolute inset-0 bg-linear-to-t from-brand-900/55 via-brand-900/5 to-transparent"
          aria-hidden
        />
        <span className="eyebrow absolute left-4 top-4 rounded-md bg-white/95 px-2 py-1 text-brand-700 shadow-xs backdrop-blur-sm">
          {PROPERTY_LABEL[a.propertyType ?? "HOUSE_SALE"][locale === "en" ? "en" : "fr"]}
        </span>
        {a.availabilityStatus === "UNDER_OFFER" && (
          <UnderOffer className="absolute bottom-3 right-3 shadow-xs" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <CardKind kind={cardKind(listing)} />
        <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0">
            {lz(listing.title)}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-ink-500">
          <MapPin className="size-3.5 text-ink-300" />
          {listing.city}
        </p>
        {propertySizes(a).length ? (
          <p className="text-sm text-ink-700">
            {propertySizes(a)
              .map((s) => sizeText(s, t))
              .join(" · ")}
          </p>
        ) : null}
        <div className="mt-auto pt-3">
          <PromoWas promotion={listing.promotion} />
          <Price
            money={listing.sellPrice}
            className="display block text-[24px] leading-none text-brand-900"
          />
          <p className="mt-1 text-xs text-ink-500">
            {a.priceBasis === "PER_MONTH" ? t("listing.perMonth") : t("listing.total")}
          </p>
          <PromoEnds promotion={listing.promotion} />
        </div>
      </div>
    </article>
  );
}

export function DestinationTile({
  city
}: {
  city: { slug: string; name: string; image: string; province: string };
}) {
  return (
    <Link
      href={`/hotels?destination=${encodeURIComponent(city.name)}`}
      className="group relative block aspect-4/5 overflow-hidden rounded-xl2 shadow-md ring-1 ring-brand-900/5 transition-shadow hover:shadow-lg"
    >
      <Image
        src={mediaUrl(city.image)}
        alt={city.name}
        fill
        sizes="(max-width: 768px) 50vw, 320px"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
      />
      <div className="absolute inset-0 bg-linear-to-t from-brand-900/90 via-brand-900/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="eyebrow text-accent-500">{city.province}</p>
        <p className="display mt-1 text-[22px] leading-tight">{city.name}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-white/80 transition-colors group-hover:text-white">
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** The grid's tile for a listing, as `ResultRow` is the list's row. */
export function ResultTile({ listing }: { listing: Listing }) {
  switch (listing.vertical) {
    case "FLIGHT":
    case "BUS":
      return <RouteTile listing={listing} />;
    case "CAR":
    case "ACTIVITY":
      return <DealTile listing={listing} />;
    case "PROPERTY":
      return <PropertyTile listing={listing} />;
    default:
      return null;
  }
}

/** One row component to pick from, so pages do not each grow a switch. */
export function ResultRow({ listing }: { listing: Listing }) {
  switch (listing.vertical) {
    case "FLIGHT":
    case "BUS":
      return <RouteRow listing={listing} />;
    case "CAR":
      return <CarRow listing={listing} />;
    case "ACTIVITY":
      return <ActivityRow listing={listing} />;
    case "PROPERTY":
      return <PropertyRow listing={listing} />;
    default:
      return null;
  }
}
