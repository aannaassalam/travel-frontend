import { NoImageSpot } from "@/components/art/spots";
import { Price, PolicyChip, RatingBadge, Scarcity, Stars, hasPrice } from "@/components/site/bits";
import { detailHref, hotelHref } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media";
import { durationBetween, fmtDate, fmtTime, formatMinutes } from "@/lib/format";
import { facetLabel } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Hotel, Listing, Money } from "@/typescript/interface/domain.interface";
import {
  ArrowRight,
  Bed,
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
  return (
    <span className="chip" style={{ ["--chip-color" as string]: VERTICAL_COLOR[vertical] }}>
      {Icon && <Icon className="size-3" />}
      {label}
    </span>
  );
}

/**
 * Result cards.
 *
 * The dense, scannable row — image left, detail centre, price rail right — is
 * the pattern Booking.com and Expedia trained the market on. §11.6: take the
 * layout, leave the manipulation. No "booked 8 times today", no fake struck
 * -through prices, no countdown that resets on reload.
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
  href,
  cta,
  available,
  noun,
  soldOutCta
}: {
  money: Money | number | undefined;
  suffix?: string;
  href: string;
  cta: string;
  available: number;
  noun?: "seat" | "room" | "unit";
  soldOutCta?: string;
}) {
  const { t } = usePrefs();
  const soldOut = available <= 0;
  return (
    <div className="flex shrink-0 flex-col justify-end gap-3 bg-ink-50/60 p-5 sm:w-60 sm:text-right">
      <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
        <div>
          <p className="eyebrow text-ink-300">{t("listing.from")}</p>
          <Price
            money={money}
            className="display block text-[28px] leading-none text-brand-900"
          />
          {suffix && <p className="mt-1 text-xs text-ink-500">{suffix}</p>}
        </div>
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

/* --------------------------------------------------------------- flight row */

export function FlightRow({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const segs = listing.attributes.segments ?? [];
  return (
    <article className={cn(SHELL, "sm:flex-row")}>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerticalChip vertical="FLIGHT" label={segs[0]?.carrier ?? ""} Icon={Plane} />
          <span className="rounded bg-ink-50 px-2 py-1 text-xs font-medium text-ink-700">
            {t(`cabin.${listing.attributes.cabin ?? "ECONOMY"}`)}
          </span>
          <span className="rounded bg-ink-50 px-2 py-1 text-xs font-medium text-ink-700">
            {listing.attributes.tripType === "RETURN"
              ? t("search.return")
              : t("search.oneWay")}
          </span>
          <PolicyChip />
        </div>

        <h3 className="text-lg font-bold text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0 hover:underline">
            {lz(listing.title)}
          </Link>
        </h3>

        <ul className="space-y-2.5">
          {segs.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-mono text-base font-bold text-ink-900">
                {fmtTime(s.departsAt, locale)}
              </span>
              <span className="font-semibold text-ink-700">{s.origin}</span>
              <span className="flex items-center gap-1 text-xs text-ink-500">
                <span className="h-px w-8 bg-ink-300" />
                {durationBetween(s.departsAt, s.arrivesAt, locale)}
                <span className="h-px w-8 bg-ink-300" />
              </span>
              <span className="font-mono text-base font-bold text-ink-900">
                {fmtTime(s.arrivesAt, locale)}
              </span>
              <span className="font-semibold text-ink-700">{s.destination}</span>
              <span className="text-xs text-ink-500">
                {fmtDate(s.departsAt, locale)} · {s.flightNumber}
              </span>
            </li>
          ))}
        </ul>

        {listing.attributes.baggage && (
          <p className="line-clamp-1 text-xs text-ink-500">{listing.attributes.baggage}</p>
        )}
        <p className="sr-only">{lz(listing.description)}</p>
      </div>

      <PriceRail
        money={listing.sellPrice}
        suffix={t("listing.perPerson")}
        href={detailHref(listing)}
        cta={t("listing.select")}
        available={listing.available}
        noun="seat"
      />
    </article>
  );
}

/* ------------------------------------------------------------------ bus row */

export function BusRow({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const a = listing.attributes;
  return (
    <article className={SHELL}>
      <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="h-44 sm:h-auto sm:w-60" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerticalChip vertical="BUS" label={a.operator ?? ""} />
          <span className="rounded bg-ink-50 px-2 py-1 text-xs font-medium text-ink-700">
            {a.vehicleClass}
          </span>
          <PolicyChip />
        </div>
        <h3 className="text-lg font-bold text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0 hover:underline">
            {lz(listing.title)}
          </Link>
        </h3>
        {a.departsAt && a.arrivesAt && (
          <p className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono text-base font-bold">{fmtTime(a.departsAt, locale)}</span>
            <span className="flex items-center gap-1 text-xs text-ink-500">
              <Clock className="size-3.5" />
              {durationBetween(a.departsAt, a.arrivesAt, locale)}
            </span>
            <span className="font-mono text-base font-bold">{fmtTime(a.arrivesAt, locale)}</span>
            <span className="text-xs text-ink-500">{fmtDate(a.departsAt, locale)}</span>
          </p>
        )}
        {a.routeStops && (
          <p className="line-clamp-1 text-sm text-ink-500">
            {t("listing.stops")} : {a.routeStops.join(" → ")}
          </p>
        )}
        <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
      </div>
      <PriceRail
        money={listing.sellPrice}
        suffix={t("listing.perPerson")}
        href={detailHref(listing)}
        cta={t("listing.select")}
        available={listing.available}
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
        <div className="flex flex-wrap items-center gap-2">
          <VerticalChip vertical="CAR" label={a.category ?? ""} />
          {a.withDriver && (
            <span className="chip" style={{ ["--chip-color" as string]: "var(--color-teal-600)" }}>
              {locale === "fr" ? "Chauffeur inclus" : "Driver included"}
            </span>
          )}
          <PolicyChip />
        </div>
        <h3 className="text-lg font-bold text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0 hover:underline">
            {lz(listing.title)}
          </Link>
        </h3>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-700">
          <li className="flex items-center gap-1.5">
            <Settings2 className="size-4 text-ink-500" />
            {a.transmission === "AUTOMATIC"
              ? locale === "fr" ? "Automatique" : "Automatic"
              : locale === "fr" ? "Manuelle" : "Manual"}
          </li>
          <li className="flex items-center gap-1.5">
            <Gauge className="size-4 text-ink-500" />
            {a.mileageLimit}
          </li>
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4 text-ink-500" />
            {a.pickupLocations?.[0]}
          </li>
        </ul>
        <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
      </div>
      <PriceRail
        money={listing.sellPrice}
        suffix={t("listing.perDay")}
        href={detailHref(listing)}
        cta={t("listing.select")}
        available={listing.available}
      />
    </article>
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
  const cheapest = hotel.roomTypes.reduce(
    (best, r) => (r.available > 0 && r.sellPrice < best ? r.sellPrice : best),
    hotel.fromPrice
  );
  const available = hotel.roomTypes.reduce((n, r) => n + r.available, 0);
  return (
    <article className={SHELL}>
      <Thumb src={mediaUrl(hotel.images[0])} alt={lz(hotel.name)} className="h-52 sm:h-auto sm:w-64" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
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
        money={cheapest}
        suffix={t("listing.perNight")}
        href={hotelHref(hotel)}
        cta={t("listing.details")}
        available={available}
        noun="room"
      />
    </article>
  );
}

/* ------------------------------------------------------------- property row */

export function PropertyRow({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const a = listing.attributes;
  const isRent = a.priceBasis === "PER_MONTH";
  return (
    <article className={SHELL}>
      <Thumb src={mediaUrl(listing.images[0])} alt={lz(listing.title)} className="h-52 sm:h-auto sm:w-64" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerticalChip
            vertical="PROPERTY"
            label={PROPERTY_LABEL[a.propertyType ?? "HOUSE_SALE"][locale === "en" ? "en" : "fr"]}
          />
          {a.availabilityStatus === "UNDER_OFFER" && (
            <span className="rounded bg-warn-100 px-2 py-1 text-xs font-semibold text-warn-600">
              {locale === "fr" ? "Sous offre" : "Under offer"}
            </span>
          )}
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
          {a.areaSqm ? (
            <li className="flex items-center gap-1.5">
              <Maximize className="size-4 text-ink-500" />
              {a.areaSqm} m²
            </li>
          ) : null}
          {a.plotSizeSqm ? (
            <li className="flex items-center gap-1.5">
              <Ruler className="size-4 text-ink-500" />
              {locale === "fr" ? "Parcelle" : "Plot"} {a.plotSizeSqm.toLocaleString("fr-FR")} m²
            </li>
          ) : null}
        </ul>
      </div>
      <div className="flex shrink-0 flex-col justify-end gap-3 bg-ink-50/60 p-5 sm:w-60 sm:text-right">
        <div>
          <Price
            money={listing.sellPrice}
            className="display block text-[28px] leading-none text-brand-900"
          />
          <p className="mt-1 text-xs text-ink-500">
            {isRent ? t("listing.perMonth") : t("listing.total")}
          </p>
        </div>
        {/* §1.1 archetype C: no checkout for property, ever. */}
        <Link href={detailHref(listing)} className="btn btn-md btn-dark w-full">
          {t("listing.enquire")}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
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

/** Homepage / cross-sell tile. */
export function DealTile({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const suffix =
    listing.vertical === "CAR"
      ? t("listing.perDay")
      : listing.vertical === "HOTEL"
        ? t("listing.perNight")
        : t("listing.perPerson");
  return (
    <article className={TILE}>
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-50">
        <Image
          src={mediaUrl(listing.images[0])}
          alt={lz(listing.title)}
          fill
          sizes="(max-width: 768px) 100vw, 340px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
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
        <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0">
            {lz(listing.title)}
          </Link>
        </h3>
        <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="eyebrow text-ink-300">{t("listing.from")}</p>
            <Price
              money={listing.sellPrice}
              className="display block text-[24px] leading-none text-brand-900"
            />
            <p className="mt-1 text-xs text-ink-500">{suffix}</p>
          </div>
          <span className="text-[11px] text-ink-300">
            {locale === "fr" ? "Non remboursable" : "Non-refundable"}
          </span>
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
        <Image
          src={mediaUrl(hotel.images[0])}
          alt={lz(hotel.name)}
          fill
          sizes="(max-width: 768px) 100vw, 340px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-linear-to-t from-brand-900/55 via-brand-900/5 to-transparent"
          aria-hidden
        />
        <span className="absolute left-4 top-4 rounded-md bg-white/95 px-2 py-1 shadow-xs backdrop-blur-sm">
          <Stars n={hotel.stars} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
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
        <div className="mt-auto pt-3">
          {/*
            No price rather than a wrong one. The related-hotels projection can
            return 0 where no room has been priced for the dates, and "from $0"
            on a hotel card is worse than silence — it is the number the whole
            card is selling.
          */}
          {hasPrice(hotel.fromPrice) ? (
            <>
              <p className="eyebrow text-ink-300">{t("listing.from")}</p>
              <Price
                money={hotel.fromPrice}
                className="display block text-[24px] leading-none text-brand-900"
              />
              <p className="mt-1 text-xs text-ink-500">{t("listing.perNight")}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-brand-600">
              {t("listing.details")}
            </p>
          )}
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
        <Image
          src={mediaUrl(listing.images[0])}
          alt={lz(listing.title)}
          fill
          sizes="(max-width: 768px) 100vw, 340px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-linear-to-t from-brand-900/55 via-brand-900/5 to-transparent"
          aria-hidden
        />
        <span className="eyebrow absolute left-4 top-4 rounded-md bg-white/95 px-2 py-1 text-brand-700 shadow-xs backdrop-blur-sm">
          {PROPERTY_LABEL[a.propertyType ?? "HOUSE_SALE"][locale === "en" ? "en" : "fr"]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-brand-900">
          <Link href={detailHref(listing)} className="after:absolute after:inset-0">
            {lz(listing.title)}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-ink-500">
          <MapPin className="size-3.5 text-ink-300" />
          {listing.city}
        </p>
        <div className="mt-auto pt-3">
          <Price
            money={listing.sellPrice}
            className="display block text-[24px] leading-none text-brand-900"
          />
          <p className="mt-1 text-xs text-ink-500">
            {a.priceBasis === "PER_MONTH" ? t("listing.perMonth") : t("listing.total")}
          </p>
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

/** One row component to pick from, so pages do not each grow a switch. */
export function ResultRow({ listing }: { listing: Listing }) {
  switch (listing.vertical) {
    case "FLIGHT":
      return <FlightRow listing={listing} />;
    case "BUS":
      return <BusRow listing={listing} />;
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
