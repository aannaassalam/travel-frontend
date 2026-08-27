import CartBar from "@/components/restaurant/CartBar";
import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { getRestaurant } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import {
  MENU_SECTIONS,
  MenuItem,
  MenuSection,
  Restaurant
} from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import { Bike, Clock, MapPin, Minus, Phone, Plus, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";

/** Section headings, in the order MENU_SECTIONS declares them. */
const SECTION_LABEL: Record<MenuSection, { fr: string; en: string }> = {
  STARTER: { fr: "Entrées", en: "Starters" },
  MAIN: { fr: "Plats", en: "Mains" },
  SIDE: { fr: "Accompagnements", en: "Sides" },
  DESSERT: { fr: "Desserts", en: "Desserts" },
  DRINK: { fr: "Boissons", en: "Drinks" }
};

export default function RestaurantPage() {
  const router = useRouter();
  const slug = String(router.query.slug ?? "");
  const { t, locale, currency } = usePrefs();

  const { data, isPending, isError } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: ({ signal }) => getRestaurant(slug, { signal }),
    enabled: Boolean(slug),
    staleTime: 60_000
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
            ? locale === "fr"
              ? "Ce restaurant est introuvable."
              : "That restaurant could not be found."
            : t("common.loading")}
        </div>
      </Layout>
    );
  }

  const name = r.name.fr || r.name.en || "";
  // Grouped here rather than by the API: the endpoint already returns the menu
  // in reading order, so this only has to preserve it.
  const sections = (Object.keys(MENU_SECTIONS) as MenuSection[])
    .map((s) => ({ section: s, items: (r.menu ?? []).filter((m) => m.section === s) }))
    .filter((g) => g.items.length);

  return (
    <Layout
      title={`${name} — ${r.city}`}
      description={r.description.fr || r.description.en || ""}
      image={r.images[0]}
    >
      <div className="relative h-64 w-full overflow-hidden bg-ink-100 sm:h-80">
        <Image
          src={r.images[0] ?? "/img/banner-1.svg"}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 to-transparent" />
      </div>

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
            {r.description.fr || r.description.en}
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
              {r.openingHours}
            </span>
            {r.phone && (
              <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:underline">
                <Phone className="size-4 text-brand-500" />
                {r.phone}
              </a>
            )}
          </div>

          {/* §1: the delivery cost belongs here, not at the last step — a fee
              that appears only at checkout is what loses the order. */}
          {r.deliveryZones.length > 0 && (
            <div className="mt-5 rounded-card bg-brand-50 p-5 ring-1 ring-brand-100 ring-inset">
              <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
                <Bike className="size-4" />
                {locale === "fr" ? "Zones de livraison" : "Delivery zones"}
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {r.deliveryZones.map((z) => (
                  <li
                    key={z.id}
                    className="flex items-baseline justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-ink-900">{z.name}</span>
                    <span className="text-ink-700">
                      {price(z.fee, currency, locale)}
                      <span className="ml-2 text-ink-500">
                        · {r.prepTimeMinutes + z.etaMinutes} min
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {r.deliveryZones.some((z) => z.minOrder) && (
                <p className="mt-3 text-xs text-ink-500">
                  {locale === "fr"
                    ? "Certaines zones ont une commande minimum, indiquée au paiement."
                    : "Some zones have a minimum order, shown at checkout."}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom padding clears the sticky cart bar on mobile. */}
        <div className="space-y-10 pb-28">
          {sections.map(({ section, items }) => (
            <section key={section}>
              <h2 className="mb-4 text-xl font-bold text-brand-900">
                {locale === "fr" ? SECTION_LABEL[section].fr : SECTION_LABEL[section].en}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <MenuRow key={item.id} item={item} restaurant={r} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <CartBar />
    </Layout>
  );
}

function MenuRow({ item, restaurant }: { item: MenuItem; restaurant: Restaurant }) {
  const { locale, currency } = usePrefs();
  const { lines, add, setQuantity } = useCart();
  const line = lines.find((l) => l.menuItemId === item.id);
  const qty = line?.quantity ?? 0;

  const soldOut = !item.isAvailable;

  return (
    <li
      className={`surface flex gap-4 p-4 ${soldOut ? "opacity-60" : ""}`}
      // The dish stays on the menu when 86'd rather than vanishing, so someone
      // looking for yesterday's order learns it is off today.
      aria-disabled={soldOut || undefined}
    >
      {item.images?.[0] && (
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-ink-50">
          <Image src={item.images[0]} alt="" fill sizes="80px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-ink-900">{item.name.fr || item.name.en}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">
          {item.description.fr || item.description.en}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-bold text-brand-900">
            {price(item.sellPrice, currency, locale)}
          </span>

          {soldOut ? (
            <span className="rounded-md bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
              {locale === "fr" ? "Épuisé aujourd’hui" : "Sold out today"}
            </span>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={() => add(item, restaurant)}
              className="btn btn-sm btn-dark"
            >
              <Plus className="size-4" />
              {locale === "fr" ? "Ajouter" : "Add"}
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-xl bg-brand-50 p-1 ring-1 ring-brand-100 ring-inset">
              <button
                type="button"
                onClick={() => setQuantity(item.id, qty - 1)}
                aria-label={locale === "fr" ? "Retirer un" : "Remove one"}
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
                aria-label={locale === "fr" ? "Ajouter un" : "Add one"}
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
