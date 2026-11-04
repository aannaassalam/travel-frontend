import CartBar from "@/components/restaurant/CartBar";
import Gallery, { PhotoGrid } from "@/components/catalog/Gallery";
import Lightbox from "@/components/catalog/Lightbox";
import ListingVideo from "@/components/catalog/ListingVideo";
import LocationMap from "@/components/catalog/LocationMap";
import Reviews from "@/components/catalog/Reviews";
import { Breadcrumbs, PromoEnds, PromoWas } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { getRestaurant } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { mediaUrl, mediaUrls } from "@/lib/media";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import {
  MENU_SECTIONS,
  MenuItem,
  MenuSection,
  Restaurant
} from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import { Bike, Clock, Images, MapPin, Minus, Phone, Plus, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";

/** Section headings, in the order MENU_SECTIONS declares them. */
const SECTION_KEY: Record<MenuSection, string> = {
  STARTER: "pg.menu.section.starter",
  MAIN: "pg.menu.section.main",
  SIDE: "pg.menu.section.side",
  DESSERT: "pg.menu.section.dessert",
  DRINK: "pg.menu.section.drink"
};

export default function RestaurantPage() {
  const router = useRouter();
  const slug = String(router.query.slug ?? "");
  const { t, locale, currency, lz } = usePrefs();

  const { data, isPending, isError } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: ({ signal }) => getRestaurant(slug, { signal }),
    enabled: Boolean(slug),
    // Re-read when the page opens again: dishes and their promotions change in the admin.
    refetchOnMount: true,
    staleTime: 30_000
  });

  const r = data?.restaurant;

  if (isPending || !r) {
    return (
      <Layout
        title={t("nav.restaurants")}
        description=""
        noindex={isError}
      >
        <div className="container-site py-16 text-center text-ink-500">
          {isError
            ? t("pg.menu.notFound")
            : t("common.loading")}
        </div>
      </Layout>
    );
  }

  const name = lz(r.name);
  // Grouped here rather than by the API: the endpoint already returns the menu
  // in reading order, so this only has to preserve it.
  const sections = (Object.keys(MENU_SECTIONS) as MenuSection[])
    .map((s) => ({ section: s, items: (r.menu ?? []).filter((m) => m.section === s) }))
    .filter((g) => g.items.length);

  return (
    <Layout
      title={`${name} — ${r.city}`}
      description={lz(r.description)}
      image={mediaUrl(r.images[0])}
    >
      <div className="container-site py-8">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.restaurants"), href: "/restaurants" },
            { label: name }
          ]}
        />

        <div className="mb-8">
          <h1 className="display text-[30px] leading-tight text-brand-900 sm:text-[38px]">{name}</h1>
          <p className="mt-2 max-w-2xl text-base text-ink-700">
            {lz(r.description)}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-700">
            {r.rating ? (
              <span className="flex items-center gap-1.5">
                <Star className="size-4 fill-accent-500 text-accent-500" />
                <strong className="font-semibold text-ink-900">{r.rating.toFixed(1)}</strong>
                <span className="text-ink-500">({r.reviewCount})</span>
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-brand-500" />
              {r.address}, {r.city}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-brand-500" />
              {lz(r.openingHours)}
            </span>
            {r.phone && (
              <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:underline">
                <Phone className="size-4 text-brand-500" />
                <span dir="ltr">{r.phone}</span>
              </a>
            )}
          </div>

          {/* §1: the delivery cost belongs here, not at the last step — a fee
              that appears only at checkout is what loses the order. */}
          {r.deliveryZones.length > 0 && (
            <div className="mt-5 rounded-card bg-brand-50 p-5 ring-1 ring-brand-100 ring-inset">
              <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
                <Bike className="size-4" />
                {t("pg.menu.deliveryZones")}
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {r.deliveryZones.map((z) => (
                  <li
                    key={z.id}
                    className="flex items-baseline justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-ink-900">{lz(z.name)}</span>
                    <span className="text-ink-700">
                      {price(z.fee, currency, locale)}
                      <span className="ms-2 text-ink-500">
                        · {t("pg.menu.minutes", { n: r.prepTimeMinutes + z.etaMinutes })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {r.deliveryZones.some((z) => z.minOrder) && (
                <p className="mt-3 text-xs text-ink-500">
                  {t("pg.menu.minOrderNote")}
                </p>
              )}
            </div>
          )}
        </div>

        <Gallery images={r.images} alt={name} />

        {/* Bottom padding clears the sticky cart bar on mobile. */}
        <div className="mt-8 space-y-10 pb-28">
          <ListingVideo url={r.videoUrl} poster={r.images[0]} title={name} />
          <PhotoGrid images={r.images} alt={name} />
          {sections.map(({ section, items }) => (
            <section key={section}>
              <h2 className="mb-4 text-xl font-bold text-brand-900">
                {t(SECTION_KEY[section])}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <MenuRow key={item.id} item={item} restaurant={r} />
                ))}
              </ul>
            </section>
          ))}

          {/*
            Where it is. A delivery customer never needs this, but someone
            deciding whether to walk over does — and the address alone does not
            answer "how far is that from me".
          */}
          <section>
              <h2 className="mb-4 text-xl font-bold text-brand-900">
                {t("listing.location")}
              </h2>
              <div className="overflow-hidden rounded-card ring-1 ring-ink-100 ring-inset">
                <LocationMap
                  geo={r.geo}
                  city={r.city}
                  label={`${name} — ${r.address}`}
                  className="h-64"
                />
                <p className="p-4 text-[15px] text-ink-700">
                  {r.address}, {r.city}
                </p>
              </div>
          </section>

          <Reviews targetType="RESTAURANT" target={r.id} />
        </div>
      </div>

      <CartBar />
    </Layout>
  );
}

function MenuRow({ item, restaurant }: { item: MenuItem; restaurant: Restaurant }) {
  const { t, locale, currency, lz } = usePrefs();
  const { lines, add, setQuantity } = useCart();
  const line = lines.find((l) => l.menuItemId === item.id);
  const qty = line?.quantity ?? 0;

  const soldOut = !item.isAvailable;
  // Every photo the office added to the dish, full screen from its thumbnail.
  // (mediaUrls stands a placeholder in for an empty list; a dish without photos shows none.)
  const photos = item.images?.length ? mediaUrls(item.images) : [];
  const [photo, setPhoto] = useState<number | null>(null);
  const dishName = lz(item.name);

  return (
    <li
      className={`surface flex gap-4 p-4 ${soldOut ? "opacity-60" : ""}`}
      // The dish stays on the menu when 86'd rather than vanishing, so someone
      // looking for yesterday's order learns it is off today.
      aria-disabled={soldOut || undefined}
    >
      {photos[0] && (
        <button
          type="button"
          onClick={() => setPhoto(0)}
          aria-label={photos.length > 1 ? t("listing.gallery", { n: photos.length }) : dishName}
          className="relative size-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
        >
          <Image src={mediaUrl(item.images![0])} alt="" fill sizes="80px" className="object-cover" />
          {photos.length > 1 && (
            <span className="tnum absolute end-1 bottom-1 flex items-center gap-0.5 rounded-md bg-black/60 px-1 py-0.5 text-[10px] font-semibold text-white">
              <Images className="size-3" aria-hidden="true" />
              {photos.length}
            </span>
          )}
        </button>
      )}
      <Lightbox images={photos} alt={dishName} index={photo} onChange={setPhoto} />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-ink-900">{dishName}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">
          {lz(item.description)}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <span className="font-bold text-brand-900">
              {price(item.sellPrice, currency, locale)}
            </span>
            <PromoWas promotion={item.promotion} className="ms-1.5" />
            <PromoEnds promotion={item.promotion} className="mt-0.5" />
          </div>

          {soldOut ? (
            <span className="rounded-md bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
              {t("pg.menu.soldOut")}
            </span>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={() => add(item, restaurant)}
              className="btn btn-sm btn-dark"
            >
              <Plus className="size-4" />
              {t("pg.menu.add")}
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-xl bg-brand-50 p-1 ring-1 ring-brand-100 ring-inset">
              <button
                type="button"
                onClick={() => setQuantity(item.id, qty - 1)}
                aria-label={t("pg.menu.removeOne")}
                className="grid size-8 place-items-center rounded-lg text-brand-900 transition-colors hover:bg-white"
              >
                <Minus className="size-4" />
              </button>
              <span className="tnum w-6 text-center text-sm font-bold text-brand-900" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => add(item, restaurant)}
                aria-label={t("pg.menu.addOne")}
                className="grid size-8 place-items-center rounded-lg text-brand-900 transition-colors hover:bg-white"
              >
                <Plus className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
