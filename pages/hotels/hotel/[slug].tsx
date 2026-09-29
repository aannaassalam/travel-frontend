import Gallery from "@/components/catalog/Gallery";
import RecentlyViewed, { useRecordView } from "@/components/catalog/RecentlyViewed";
import Reviews from "@/components/catalog/Reviews";
import LeadForm from "@/components/catalog/LeadForm";
import SaveButton from "@/components/catalog/SaveButton";
import { DatePicker } from "@/components/ui/DatePicker";
import { InlineSelect } from "@/components/ui/InlineSelect";
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
import LocationMap from "@/components/catalog/LocationMap";
import Layout from "@/components/site/Layout";
import { getHotel, getSlugs, safely } from "@/lib/api";
import { useCheckout } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { mediaUrl, mediaUrls } from "@/lib/media";
import { multiply, nightsBetween } from "@/lib/money";
import { facetLabel } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { Hotel, RoomType } from "@/typescript/interface/domain.interface";
import { BedDouble, Check, Clock, MapPin, Maximize, Users } from "lucide-react";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

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

export default function HotelDetail({ hotel: initialHotel, others }: Props) {
  const { t, locale, lz } = usePrefs();
  const router = useRouter();
  const { start } = useCheckout();
  useRecordView(initialHotel.slug);

  // Dates come from the search bar when the customer arrived from a search,
  // otherwise a sensible two-night default they can change in place.
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(plusDays(today(), 2));
  const [adults, setAdults] = useState(2);
  const [rooms, setRooms] = useState(1);

  /**
   * Adopt the search's dates once the router has them.
   *
   * This page is statically generated, so on the first render `router.query` is
   * an empty object — Next only fills it after hydration, which is what
   * `isReady` signals. Reading it in `useState` therefore captured nothing but
   * the defaults, and a customer who searched "3 nights in December" landed on
   * a page quietly showing tonight plus two, with the URL still saying December.
   *
   * Runs on `isReady` rather than on every query change, so it seeds the form
   * and then leaves it alone — otherwise editing a date would fight the URL.
   */
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query as Record<string, string | undefined>;
    if (q.from) setFrom(q.from);
    if (q.to) setTo(q.to);
    else if (q.from) setTo(plusDays(q.from, 2));
    if (Number(q.adults)) setAdults(Number(q.adults));
    if (Number(q.rooms)) setRooms(Number(q.rooms));
  }, [router.isReady, router.query]);

  const nights = nightsBetween(from, to);

  /**
   * Re-price for the nights the customer actually chose.
   *
   * The page is statically generated without dates, so `initialHotel` carries
   * the cheapest rate on record and the full allotment — a fair thing to show
   * someone who has not picked dates yet, and wrong the moment they do.
   * `getStaticProps` always said the page "refetches for the visitor's actual
   * nights once they pick them"; this is that refetch, which had never been
   * written. Until now, changing the dates moved the labels and left the
   * prices and availability untouched.
   *
   * `placeholderData` keeps the previous rooms on screen while the new ones
   * load, so the list does not collapse to a spinner on every date tweak.
   */
  const { data: priced, isFetching } = useQuery({
    queryKey: ["hotel", initialHotel.slug, from, to],
    queryFn: () => getHotel(initialHotel.slug, from, to),
    enabled: Boolean(from && to && nights > 0),
    placeholderData: (prev) => prev,
    staleTime: 60_000
  });

  /**
   * The freshly priced hotel once it arrives, the build-time one until then.
   * Never a mix: a room list from one response with a price from another is
   * how a customer is quoted a rate that does not exist.
   */
  const hotel = priced?.hotel ?? initialHotel;

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
                    {facetLabel(locale, a)}
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
                  <DatePicker
                    value={from}
                    onChange={setFrom}
                    locale={locale}
                    min={today()}
                    placeholder={t("search.date")}
                    triggerClassName="rounded-xl bg-white px-4 py-3 text-base shadow-xs ring-1 ring-ink-100 ring-inset focus-within:ring-2 focus-within:ring-brand-500"
                  />
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t("search.checkout")}
                  </span>
                  <DatePicker
                    value={to}
                    onChange={setTo}
                    locale={locale}
                    min={plusDays(from, 1)}
                    placeholder={t("search.date")}
                    triggerClassName="rounded-xl bg-white px-4 py-3 text-base shadow-xs ring-1 ring-ink-100 ring-inset focus-within:ring-2 focus-within:ring-brand-500"
                  />
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t("search.adults")}
                  </span>
                  <InlineSelect
                    ariaLabel={t("search.adults")}
                    value={String(adults)}
                    onValueChange={(v) => setAdults(Number(v))}
                    options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
                    triggerClassName="w-full justify-between rounded-xl px-4 py-3 text-base shadow-xs"
                  />
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t("search.rooms")}
                  </span>
                  <InlineSelect
                    ariaLabel={t("search.rooms")}
                    value={String(rooms)}
                    onValueChange={(v) => setRooms(Number(v))}
                    options={[1, 2, 3].map((n) => ({ value: String(n), label: String(n) }))}
                    triggerClassName="w-full justify-between rounded-xl px-4 py-3 text-base shadow-xs"
                  />
                </label>
              </div>

              <p className="mb-3 text-sm text-ink-500">
                {fmtDate(from, locale)} → {fmtDate(to, locale)} ·{" "}
                <strong className="font-semibold text-ink-700">
                  {nights} {t(nights > 1 ? "common.nights" : "common.night")}
                </strong>
              </p>

              {/*
                Dim the list while re-pricing rather than replacing it with a
                spinner. The rooms shown are still the previous nights' — true
                until the new ones land — and a skeleton here would make an
                ordinary date tweak feel like the page broke.
              */}
              <ul
                className={cn(
                  "space-y-4 transition-opacity",
                  isFetching && "pointer-events-none opacity-60"
                )}
                aria-busy={isFetching}
              >
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
                          className={cn(
                            "btn btn-sm",
                            /*
                              Sold out is a real `disabled` — it cannot be
                              recovered from on this screen. But the system's
                              disabled styling fades to 55% opacity, and a grey
                              button at 55% puts "Épuisé" under the contrast
                              floor. Supplying a solid unavailable colour is
                              clearer than a faint one, so the opacity is
                              overridden rather than the semantics.
                            */
                            soldOut
                              ? "cursor-not-allowed bg-ink-100 text-ink-500 disabled:opacity-100"
                              : "btn-primary"
                          )}
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
                {/* Leaflet, bundled — never a third-party script. Tiles load
                    only when the visitor asks, so the default page still makes
                    no request to a mapping provider. */}
                <LocationMap
                  geo={hotel.geo}
                  city={hotel.city}
                  label={`${hotel.address}, ${hotel.city}`}
                  className="h-64"
                />
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
                className="btn btn-lg btn-primary mt-4 w-full"
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
