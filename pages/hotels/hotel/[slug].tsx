import Gallery from "@/components/catalog/Gallery";
import RecentlyViewed, { useRecordView } from "@/components/catalog/RecentlyViewed";
import Reviews from "@/components/catalog/Reviews";
import LeadForm from "@/components/catalog/LeadForm";
import SaveButton from "@/components/catalog/SaveButton";
import { HotelTile } from "@/components/catalog/cards";
import {
  Breadcrumbs,
  PolicyLine,
  Price,
  RatingBadge,
  Scarcity,
  SettlementNote,
  Stars
} from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { getHotel, getSlugs, safely } from "@/lib/api";
import { useCheckout } from "@/lib/checkout";
import { fmtDate } from "@/lib/format";
import { mediaUrl, mediaUrls } from "@/lib/media";
import { multiply, nightsBetween } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { Hotel, RoomType } from "@/typescript/interface/domain.interface";
import { BedDouble, Check, Clock, MapPin, Maximize, Users } from "lucide-react";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) =>
  new Date(new Date(iso).getTime() + n * 86400000).toISOString().slice(0, 10);

interface Props {
  hotel: Hotel;
  others: Hotel[];
}

const MEAL_LABEL: Record<string, { fr: string; en: string }> = {
  ROOM_ONLY: { fr: "Sans repas", en: "Room only" },
  BREAKFAST: { fr: "Petit-déjeuner inclus", en: "Breakfast included" },
  HALF_BOARD: { fr: "Demi-pension", en: "Half board" },
  FULL_BOARD: { fr: "Pension complète", en: "Full board" },
  ALL_INCLUSIVE: { fr: "Tout inclus", en: "All inclusive" }
};

export default function HotelDetail({ hotel, others }: Props) {
  const { t, locale, lz } = usePrefs();
  const router = useRouter();
  const { start } = useCheckout();
  useRecordView(hotel.slug);

  // Dates come from the search bar when the customer arrived from a search,
  // otherwise a sensible two-night default they can change in place.
  const q = router.query as Record<string, string | undefined>;
  const [from, setFrom] = useState(q.from || today());
  const [to, setTo] = useState(q.to || plusDays(q.from || today(), 2));
  const [adults, setAdults] = useState(Number(q.adults) || 2);
  const [rooms, setRooms] = useState(Number(q.rooms) || 1);

  const nights = nightsBetween(from, to);

  function book(room: RoomType) {
    start({
      vertical: "HOTEL",
      listingSlug: hotel.slug,
      listingId: hotel.id,
      label: lz(hotel.name),
      sublabel: lz(room.name),
      image: mediaUrl(room.images[0] ?? hotel.images[0]),
      unitPrice: room.sellPrice,
      quantity: rooms,
      units: nights,
      unitNoun: "night",
      roomTypeId: room.id,
      startDate: from,
      endDate: to,
      adults,
      available: room.available
    });
    router.push("/booking/travellers");
  }

  return (
    <Layout
      title={`${lz(hotel.name)} — ${hotel.city}`}
      description={lz(hotel.description).slice(0, 300)}
      image={mediaUrl(hotel.images[0])}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Hotel",
        name: lz(hotel.name),
        description: lz(hotel.description),
        image: mediaUrls(hotel.images),
        starRating: { "@type": "Rating", ratingValue: hotel.stars },
        address: {
          "@type": "PostalAddress",
          streetAddress: hotel.address,
          addressLocality: hotel.city,
          addressCountry: hotel.country
        },
        ...(hotel.geo
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: hotel.geo.lat,
                longitude: hotel.geo.lng
              }
            }
          : {}),
        ...(hotel.rating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: hotel.rating,
                reviewCount: hotel.reviewCount ?? 1
              }
            }
          : {})
      }}
    >
      <div className="container-site py-6">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.hotels"), href: "/hotels" },
            { label: lz(hotel.name) }
          ]}
        />

        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-2xl leading-tight text-brand-900 sm:text-3xl">
              {lz(hotel.name)}
            </h1>
            <Stars n={hotel.stars} />
            <span className="ml-auto">
              <SaveButton slug={hotel.slug} />
            </span>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-brand-500">
              <MapPin className="size-4" />
              {hotel.address}, {hotel.city}
            </span>
            <RatingBadge rating={hotel.rating} count={hotel.reviewCount} size="sm" />
          </p>
        </div>

        <Gallery images={hotel.images} alt={lz(hotel.name)} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-8">
            <section>
              <h2 className="mb-3 text-xl font-bold text-brand-900">
                {t("listing.description")}
              </h2>
              <p className="text-[15px] leading-relaxed text-ink-700">
                {lz(hotel.description)}
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-brand-900">
                {t("listing.amenities")}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {hotel.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-[15px] text-ink-700">
                    <Check className="size-4 shrink-0 text-ok-600" />
                    {a}
                  </li>
                ))}
              </ul>
            </section>

            {/* ------------------------------------------------- rooms */}
            <section id="rooms" className="scroll-mt-24">
              <h2 className="mb-4 text-xl font-bold text-brand-900">
                {t("listing.rooms")}
              </h2>

              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card bg-brand-50 p-5 ring-1 ring-brand-100 ring-inset">
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t("search.checkin")}
                  </span>
                  <input
                    type="date"
                    value={from}
                    min={today()}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded-xl bg-white px-4 py-3 text-base font-semibold shadow-xs ring-1 ring-ink-100 outline-none ring-inset focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t("search.checkout")}
                  </span>
                  <input
                    type="date"
                    value={to}
                    min={plusDays(from, 1)}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-xl bg-white px-4 py-3 text-base font-semibold shadow-xs ring-1 ring-ink-100 outline-none ring-inset focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t("search.adults")}
                  </span>
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full rounded-xl bg-white px-4 py-3 text-base font-semibold shadow-xs ring-1 ring-ink-100 outline-none ring-inset focus:ring-2 focus:ring-brand-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t("search.rooms")}
                  </span>
                  <select
                    value={rooms}
                    onChange={(e) => setRooms(Number(e.target.value))}
                    className="w-full rounded-xl bg-white px-4 py-3 text-base font-semibold shadow-xs ring-1 ring-ink-100 outline-none ring-inset focus:ring-2 focus:ring-brand-500"
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="mb-3 text-sm text-ink-500">
                {fmtDate(from, locale)} → {fmtDate(to, locale)} ·{" "}
                <strong className="font-semibold text-ink-700">
                  {nights} {t(nights > 1 ? "common.nights" : "common.night")}
                </strong>
              </p>

              <ul className="space-y-4">
                {hotel.roomTypes.map((room) => {
                  const total = multiply(room.sellPrice, nights * rooms);
                  const soldOut = room.available <= 0;
                  return (
                    <li
                      key={room.id}
                      className="flex flex-col gap-4 surface p-5 sm:flex-row"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-brand-900">{lz(room.name)}</h3>
                        <p className="mt-1 text-sm text-ink-500">{lz(room.description)}</p>
                        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-700">
                          <li className="flex items-center gap-1.5">
                            <BedDouble className="size-4 text-ink-500" />
                            {room.beds}
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Users className="size-4 text-ink-500" />
                            {room.maxAdults} {t("common.adults")}
                          </li>
                          {room.sizeSqm && (
                            <li className="flex items-center gap-1.5">
                              <Maximize className="size-4 text-ink-500" />
                              {room.sizeSqm} m²
                            </li>
                          )}
                        </ul>
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-ok-100 px-2 py-1 text-xs font-semibold text-ok-600">
                          <Check className="size-3.5" />
                          {MEAL_LABEL[room.mealPlan][locale === "en" ? "en" : "fr"]}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col justify-end gap-2 border-t border-ink-100/70 pt-3 sm:w-56 sm:border-l sm:border-ink-100/70 sm:border-t-0 sm:pl-4 sm:pt-0 sm:text-right">
                        <div>
                          <Price
                            money={room.sellPrice}
                            className="text-xl font-bold text-brand-900"
                          />
                          <p className="text-xs text-ink-500">{t("listing.perNight")}</p>
                          {!soldOut && (
                            <>
                              <p className="mt-1 text-sm font-semibold text-ink-700">
                                <Price money={total} /> {t("listing.total")}
                              </p>
                              <SettlementNote money={total} />
                            </>
                          )}
                        </div>
                        <div className="sm:self-end">
                          <Scarcity available={room.available} noun="room" />
                        </div>
                        <button
                          type="button"
                          disabled={soldOut}
                          onClick={() => book(room)}
                          className="rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold text-brand-900 hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500"
                        >
                          {soldOut ? t("listing.soldOut") : t("listing.book")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-brand-900">
                {t("listing.location")}
              </h2>
              <div className="overflow-hidden rounded-card ring-1 ring-ink-100 ring-inset">
                {/* No third-party map embed: §10.8's CSP forbids arbitrary
                    external scripts, and an iframe here would leak every
                    visitor's IP to a mapping provider on a catalogue page. */}
                <div className="relative h-44 bg-brand-100">
                  <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#1e5a8e_1px,transparent_1px),linear-gradient(90deg,#1e5a8e_1px,transparent_1px)] [background-size:32px_32px]" />
                  <MapPin className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-brand-900" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="text-[15px] text-ink-700">
                    {hotel.address}, {hotel.city}
                  </p>
                  {hotel.geo && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${hotel.geo.lat}&mlon=${hotel.geo.lng}#map=15/${hotel.geo.lat}/${hotel.geo.lng}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm font-semibold text-brand-500 underline"
                    >
                      {locale === "fr" ? "Ouvrir la carte" : "Open the map"}
                    </a>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-card bg-ink-50 p-6 ring-1 ring-ink-100 ring-inset">
              <h2 className="mb-2 text-lg font-bold text-brand-900">
                {t("listing.policy")}
              </h2>
              <p className="mb-3 flex items-center gap-2 text-sm text-ink-700">
                <Clock className="size-4 text-ink-500" />
                {t("search.checkin")} {hotel.checkInTime} · {t("search.checkout")}{" "}
                {hotel.checkOutTime}
              </p>
              <p className="mb-3 text-sm text-ink-700">{hotel.policies}</p>
              <PolicyLine />
            </section>

            <Reviews rating={hotel.rating} reviewCount={hotel.reviewCount} title={lz(hotel.name)} />

            <section id="request" className="scroll-mt-24 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset lg:p-8">
              <h2 className="text-lg font-bold text-brand-900">{t("rtb.title")}</h2>
              <p className="mb-4 mt-1 max-w-2xl text-sm text-ink-700">{t("rtb.body")}</p>
              <div className="rounded-lg bg-white p-5">
                <LeadForm
                  kind="REQUEST_TO_BOOK"
                  vertical="HOTEL"
                  listingLabel={lz(hotel.name)}
                  compact
                  defaultMessage={`${lz(hotel.name)} — `}
                />
              </div>
            </section>
          </div>

          {/* Right rail: a summary that jumps to the room list rather than a
              second booking form that could disagree with it. */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="surface p-6">
              <RatingBadge rating={hotel.rating} count={hotel.reviewCount} />
              <p className="mt-4 text-sm text-ink-500">{t("listing.from")}</p>
              <Price money={hotel.fromPrice} className="text-3xl font-bold text-brand-900" />
              <p className="text-sm text-ink-500">{t("listing.perNight")}</p>
              <a
                href="#rooms"
                className="mt-4 flex w-full items-center justify-center rounded-md bg-accent-500 px-5 py-3.5 text-base font-bold text-brand-900 hover:bg-accent-600"
              >
                {t("listing.rooms")}
              </a>
              <p className="mt-3 text-xs leading-relaxed text-ink-700">
                <strong className="font-semibold">{t("policy.title")}</strong> —{" "}
                {t("policy.body")}
              </p>
            </div>
          </aside>
        </div>

        <RecentlyViewed excludeSlug={hotel.slug} />

        {others.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-bold text-brand-900">
              {locale === "fr" ? "Autres hôtels" : "Other hotels"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((h) => (
                <HotelTile key={h.id} hotel={h} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { hotels } = await safely(() => getSlugs(), { listings: [], hotels: [] });
  return {
    paths: hotels.map((slug) => ({ params: { slug } })),
    fallback: "blocking"
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  try {
    // No dates at build time: the page shows the cheapest rate on record and
    // refetches for the visitor's actual nights once they pick them.
    const { hotel, others } = await getHotel(String(params?.slug));
    return { props: { hotel, others }, revalidate: 300 };
  } catch {
    return { notFound: true, revalidate: 60 };
  }
};
