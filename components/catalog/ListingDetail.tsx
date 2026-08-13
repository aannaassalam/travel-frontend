import { PolicyLine, RatingBadge, Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { detailHref, VERTICAL_SLUGS } from "@/lib/catalog";
import { mediaUrl, mediaUrls } from "@/lib/media";
import { baseMinor } from "@/lib/money";
import { durationBetween, fmtDateTime, fmtTime, formatMinutes } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { Listing } from "@/typescript/interface/domain.interface";
import {
  Check,
  Clock,
  Gauge,
  Languages,
  Luggage,
  MapPin,
  Plane,
  Settings2,
  Users,
  X
} from "lucide-react";
import BookingBox from "./BookingBox";
import RecentlyViewed, { useRecordView } from "./RecentlyViewed";
import { DealTile } from "./cards";
import Gallery from "./Gallery";
import LeadForm from "./LeadForm";
import SaveButton from "./SaveButton";

/**
 * One detail page for flights, buses, cars and activities.
 *
 * Everything shared — gallery, title block, description, policy, booking box,
 * the sold-out Request-to-Book section — lives here once. Only the middle
 * "specification" block differs per vertical, which is genuinely different
 * content rather than a different layout.
 */
export default function ListingDetail({
  listing,
  related
}: {
  listing: Listing;
  related: Listing[];
}) {
  const { t, locale, lz } = usePrefs();
  useRecordView(listing.slug);
  const a = listing.attributes;
  const verticalLabel = {
    FLIGHT: t("nav.flights"),
    BUS: t("nav.bus"),
    CAR: t("nav.cars"),
    ACTIVITY: t("nav.activities"),
    HOTEL: t("nav.hotels"),
    PROPERTY: t("nav.property")
  }[listing.vertical];

  return (
    <Layout
      title={lz(listing.title)}
      description={lz(listing.description).slice(0, 300)}
      image={mediaUrl(listing.images[0])}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: lz(listing.title),
        description: lz(listing.description),
        image: mediaUrls(listing.images),
        offers: {
          "@type": "Offer",
          price: (baseMinor(listing.sellPrice) / 100).toFixed(2),
          priceCurrency: "USD",
          availability:
            listing.available > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut"
        },
        ...(listing.rating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: listing.rating,
                reviewCount: listing.reviewCount ?? 1
              }
            }
          : {})
      }}
    >
      <div className="container-site py-6">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: verticalLabel, href: `/${VERTICAL_SLUGS[listing.vertical]}` },
            { label: lz(listing.title) }
          ]}
        />

        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-2xl leading-tight text-brand-900 sm:text-3xl">
              {lz(listing.title)}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5 text-brand-500">
                <MapPin className="size-4" />
                {listing.city}, RDC
              </span>
              <RatingBadge rating={listing.rating} count={listing.reviewCount} size="sm" />
            </p>
          </div>
          <SaveButton slug={listing.slug} />
        </div>

        <Gallery images={listing.images} alt={lz(listing.title)} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-8">
            <section>
              <h2 className="mb-3 text-xl font-bold text-brand-900">
                {t("listing.description")}
              </h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
                {lz(listing.description)}
              </p>
            </section>

            {/* ------------------------------------------------- flights */}
            {listing.vertical === "FLIGHT" && a.segments && (
              <section>
                <h2 className="mb-3 text-xl font-bold text-brand-900">
                  {t("listing.itinerary")}
                </h2>
                <ol className="space-y-4">
                  {a.segments.map((s, i) => (
                    <li
                      key={i}
                      className="surface p-5"
                    >
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-700">
                        <Plane className="size-4" />
                        {s.carrier} {s.flightNumber} ·{" "}
                        {t(`cabin.${a.cabin ?? "ECONOMY"}`)}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div>
                          <p className="font-mono text-2xl font-bold text-ink-900">
                            {fmtTime(s.departsAt, locale)}
                          </p>
                          <p className="text-sm font-semibold text-ink-700">{s.origin}</p>
                          <p className="text-xs text-ink-500">
                            {fmtDateTime(s.departsAt, locale)}
                          </p>
                        </div>
                        <div className="flex flex-col items-center text-xs text-ink-500">
                          <Clock className="size-4" />
                          {durationBetween(s.departsAt, s.arrivesAt, locale)}
                          <span className="mt-1 h-px w-20 bg-ink-300" />
                        </div>
                        <div>
                          <p className="font-mono text-2xl font-bold text-ink-900">
                            {fmtTime(s.arrivesAt, locale)}
                          </p>
                          <p className="text-sm font-semibold text-ink-700">
                            {s.destination}
                          </p>
                          <p className="text-xs text-ink-500">
                            {fmtDateTime(s.arrivesAt, locale)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                {a.baggage && (
                  <p className="mt-4 flex items-center gap-2 text-sm text-ink-700">
                    <Luggage className="size-4 text-ink-500" />
                    <strong className="font-semibold">{t("listing.baggage")} :</strong>{" "}
                    {a.baggage}
                  </p>
                )}
                {a.fareRules && (
                  <p className="mt-2 text-sm text-ink-500">{a.fareRules}</p>
                )}
              </section>
            )}

            {/* ----------------------------------------------------- bus */}
            {listing.vertical === "BUS" && (
              <section>
                <h2 className="mb-3 text-xl font-bold text-brand-900">
                  {t("listing.itinerary")}
                </h2>
                <ol className="relative space-y-4 border-l-2 border-ink-100 pl-6">
                  {(a.routeStops ?? []).map((stop, i, arr) => (
                    <li key={stop} className="relative">
                      <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-white bg-brand-500" />
                      <p className="font-semibold text-ink-900">{stop}</p>
                      {i === 0 && a.departsAt && (
                        <p className="text-sm text-ink-500">
                          {fmtDateTime(a.departsAt, locale)}
                        </p>
                      )}
                      {i === arr.length - 1 && a.arrivesAt && (
                        <p className="text-sm text-ink-500">
                          {fmtDateTime(a.arrivesAt, locale)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Spec label={t("results.operator")} value={a.operator} />
                  <Spec label={t("results.category")} value={a.vehicleClass} />
                  <Spec
                    label={locale === "fr" ? "Capacité" : "Capacity"}
                    value={a.seatsOrCapacity ? `${a.seatsOrCapacity}` : undefined}
                  />
                </dl>
              </section>
            )}

            {/* ---------------------------------------------------- cars */}
            {listing.vertical === "CAR" && (
              <section>
                <h2 className="mb-3 text-xl font-bold text-brand-900">
                  {t("listing.vehicle")}
                </h2>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Spec
                    label={locale === "fr" ? "Modèle" : "Model"}
                    value={`${a.make ?? ""} ${a.model ?? ""} ${a.year ?? ""}`.trim()}
                    Icon={Settings2}
                  />
                  <Spec
                    label={t("results.transmission")}
                    value={
                      a.transmission === "AUTOMATIC"
                        ? locale === "fr" ? "Automatique" : "Automatic"
                        : locale === "fr" ? "Manuelle" : "Manual"
                    }
                    Icon={Settings2}
                  />
                  <Spec
                    label={locale === "fr" ? "Kilométrage" : "Mileage"}
                    value={a.mileageLimit}
                    Icon={Gauge}
                  />
                  <Spec
                    label={locale === "fr" ? "Chauffeur" : "Driver"}
                    value={
                      a.withDriver
                        ? locale === "fr" ? "Inclus" : "Included"
                        : locale === "fr" ? "Non inclus" : "Not included"
                    }
                    Icon={Users}
                  />
                  <Spec
                    label={locale === "fr" ? "Caution" : "Deposit"}
                    value={a.deposit ? `${(a.deposit / 100).toFixed(0)} $` : undefined}
                  />
                  <Spec
                    label={locale === "fr" ? "Assurance" : "Insurance"}
                    value={a.insuranceTerms}
                  />
                </dl>
                {a.pickupLocations && (
                  <div className="mt-5">
                    <h3 className="mb-2 font-bold text-brand-900">
                      {locale === "fr" ? "Points de retrait" : "Pick-up points"}
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {a.pickupLocations.map((p) => (
                        <li
                          key={p}
                          className="flex items-center gap-1.5 rounded bg-ink-50 px-2.5 py-1.5 text-sm text-ink-700"
                        >
                          <MapPin className="size-3.5 text-ink-500" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* ---------------------------------------------- activities */}
            {listing.vertical === "ACTIVITY" && (
              <>
                <section>
                  <dl className="grid gap-3 sm:grid-cols-3">
                    <Spec
                      label={t("listing.duration")}
                      value={a.durationMinutes ? formatMinutes(a.durationMinutes, locale) : undefined}
                      Icon={Clock}
                    />
                    <Spec
                      label={locale === "fr" ? "Participants" : "Group size"}
                      value={
                        a.minParticipants && a.maxParticipants
                          ? `${a.minParticipants}–${a.maxParticipants}`
                          : undefined
                      }
                      Icon={Users}
                    />
                    <Spec
                      label={t("listing.languages")}
                      value={a.languages?.join(", ")}
                      Icon={Languages}
                    />
                  </dl>
                </section>

                {(a.inclusions || a.exclusions) && (
                  <section className="grid gap-6 sm:grid-cols-2">
                    {a.inclusions && (
                      <div>
                        <h2 className="mb-3 text-lg font-bold text-brand-900">
                          {t("listing.included")}
                        </h2>
                        <ul className="space-y-2">
                          {a.inclusions.map((i) => (
                            <li key={i} className="flex gap-2 text-sm text-ink-700">
                              <Check className="mt-0.5 size-4 shrink-0 text-ok-600" />
                              {i}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {a.exclusions && (
                      <div>
                        <h2 className="mb-3 text-lg font-bold text-brand-900">
                          {t("listing.excluded")}
                        </h2>
                        <ul className="space-y-2">
                          {a.exclusions.map((i) => (
                            <li key={i} className="flex gap-2 text-sm text-ink-500">
                              <X className="mt-0.5 size-4 shrink-0 text-ink-300" />
                              {i}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {a.meetingPoint && (
                  <section>
                    <h2 className="mb-2 text-lg font-bold text-brand-900">
                      {t("listing.meetingPoint")}
                    </h2>
                    <p className="flex items-center gap-2 text-[15px] text-ink-700">
                      <MapPin className="size-4 text-brand-500" />
                      {a.meetingPoint}
                    </p>
                  </section>
                )}
              </>
            )}

            <section className="rounded-card bg-ink-50 p-6 ring-1 ring-ink-100 ring-inset">
              <h2 className="mb-2 text-lg font-bold text-brand-900">
                {t("listing.policy")}
              </h2>
              <PolicyLine />
            </section>

            {/* §1.1 archetype B, always reachable — the sold-out CTA links here. */}
            <section id="request" className="scroll-mt-24 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset lg:p-8">
              <h2 className="text-lg font-bold text-brand-900">{t("rtb.title")}</h2>
              <p className="mb-4 mt-1 max-w-2xl text-sm text-ink-700">{t("rtb.body")}</p>
              <div className="rounded-lg bg-white p-5">
                <LeadForm
                  kind="REQUEST_TO_BOOK"
                  vertical={listing.vertical}
                  listingLabel={lz(listing.title)}
                  compact
                  defaultMessage={`${lz(listing.title)} — `}
                />
              </div>
            </section>
          </div>

          <div className="lg:sticky lg:top-24 lg:h-fit">
            <BookingBox listing={listing} />
          </div>
        </div>

        <RecentlyViewed excludeSlug={listing.slug} />

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-bold text-brand-900">
              {locale === "fr" ? "Autres offres similaires" : "Other similar offers"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <DealTile key={r.id} listing={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

function Spec({
  label,
  value,
  Icon
}: {
  label: string;
  value?: string;
  Icon?: typeof Clock;
}) {
  if (!value) return null;
  return (
    <div className="surface p-4">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-medium text-ink-900">{value}</dd>
    </div>
  );
}

export { detailHref };
