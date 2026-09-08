import Carousel from "@/components/catalog/Carousel";
import {
  DealTile,
  DestinationTile,
  HotelTile,
  PropertyTile
} from "@/components/catalog/cards";
import RecentlyViewed from "@/components/catalog/RecentlyViewed";
import SearchWidget from "@/components/search/SearchWidget";
import { SectionHeading } from "@/components/site/bits";
import Layout, { SITE } from "@/components/site/Layout";
import { CardSkeleton } from "@/components/ui/field";
import { getHomeFeed, getLocations, safely, type ServiceLocation } from "@/lib/api";
import { cityImage } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media";
import { dial, useSiteContact } from "@/lib/contact";
import { usePrefs } from "@/lib/prefs";
import { Hotel, Listing } from "@/typescript/interface/domain.interface";
import {
  BadgeCheck,
  Headphones,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  Smartphone
} from "lucide-react";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";

interface Props {
  deals: Listing[];
  hotels: Hotel[];
  properties: Listing[];
  heroImage: string;
  /** Serviced places, owned by the admin — not a constant in this bundle. */
  destinations: ServiceLocation[];
}

/**
 * Hero backdrop, resolved at build time in this order:
 *
 *   1. NEXT_PUBLIC_HERO_IMAGE — wins if set. Takes any form mediaUrl handles,
 *      so "/uploads/hero/<uuid>.png" from the admin uploader works too.
 *   2. public/img/hero.{jpg,jpeg,png,webp,avif} — just drop the file in and
 *      rebuild; no config, no code change.
 *   3. the generated artwork, so a missing file never breaks the page.
 *
 * The filesystem probe runs only inside getStaticProps, so `node:fs` never
 * reaches the client bundle.
 */
// Most-compressed first. next/image re-encodes on demand anyway, but the
// unoptimised path (any client sending `Accept: image/*`, and the `og:image`
// crawlers fetch) gets whatever this picks — 75 KB of WebP rather than 1.7 MB
// of PNG. Drop a file into public/img and it is used; no code change needed.
const HERO_CANDIDATES = ["hero.avif", "hero.webp", "hero.jpg", "hero.jpeg", "hero.png"];
const HERO_FALLBACK = "/img/hero-kinshasa.svg";

/** Editorial rail — the "travel inspiration" strip, not another product grid. */
const INSPIRATION = [
  {
    image: "/img/photos/gorillas-kahuzi-biega.webp",
    href: "/activities?destination=Bukavu",
    fr: { kicker: "Nature", title: "Gorilles du Kahuzi-Biega", body: "Une journée de pistage avec les rangers du parc." },
    en: { kicker: "Nature", title: "Kahuzi-Biega gorillas", body: "A day tracking with the park rangers." }
  },
  {
    image: "/img/photos/nyiragongo.webp",
    href: "/activities?destination=Goma",
    fr: { kicker: "Aventure", title: "Nuit au sommet du Nyiragongo", body: "Le lac de lave, depuis le refuge du cratère." },
    en: { kicker: "Adventure", title: "A night atop Nyiragongo", body: "The lava lake, from the crater shelter." }
  },
  {
    image: "/img/photos/congo-sunset.webp",
    href: "/activities?destination=Kinshasa",
    fr: { kicker: "Fleuve", title: "Coucher de soleil sur le Congo", body: "Trois heures d'eau depuis la baie de Ngaliema." },
    en: { kicker: "River", title: "Sunset on the Congo", body: "Three hours on the water from Ngaliema bay." }
  },
  {
    image: "/img/photos/lubumbashi-business.webp",
    href: "/hotels?destination=Lubumbashi",
    fr: { kicker: "Affaires", title: "Lubumbashi en semaine", body: "Hôtels proches de Luano, salles de réunion incluses." },
    en: { kicker: "Business", title: "Lubumbashi midweek", body: "Hotels near Luano, meeting rooms included." }
  },
  {
    image: "/img/photos/road-n1.webp",
    href: "/bus?destination=Matadi",
    fr: { kicker: "Route", title: "Kinshasa – Matadi par la nationale 1", body: "Sept heures de route, arrivée au port." },
    en: { kicker: "Road", title: "Kinshasa – Matadi on the N1", body: "Seven hours by road, arriving at the port." }
  },
  {
    image: "/img/photos/gombe-property.webp",
    href: "/property/sale/houses",
    fr: { kicker: "Immobilier", title: "Vivre à Gombe", body: "Villas et appartements, titre foncier vérifié." },
    en: { kicker: "Property", title: "Living in Gombe", body: "Villas and apartments, title verified." }
  }
];

export default function Home({ deals, hotels, properties, heroImage, destinations }: Props) {
  const contact = useSiteContact();
  const { t, locale } = usePrefs();
  const l = locale === "en" ? "en" : "fr";

  const why = [
    { Icon: BadgeCheck, title: "home.why1Title", body: "home.why1Body" },
    { Icon: Smartphone, title: "home.why2Title", body: "home.why2Body" },
    { Icon: Receipt, title: "home.why3Title", body: "home.why3Body" },
    { Icon: Headphones, title: "home.why4Title", body: "home.why4Body" }
  ];

  return (
    <Layout
      title={t("brand.tagline")}
      description={t("home.heroSubtitle")}
      image={mediaUrl(heroImage)}
      transparentHeader
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "TravelAgency",
        name: contact.companyName,
        url: SITE,
        telephone: dial(contact.phone),
        address: {
          "@type": "PostalAddress",
          streetAddress: contact.streetAddress,
          addressLocality: contact.city,
          addressCountry: contact.country
        },
        areaServed: "CD",
        currenciesAccepted: "USD, CDF, EUR",
        paymentAccepted: "Mobile money, Cash, Credit card"
      }}
    >
      {/* ------------------------------------------------------------- hero */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <Image
            src={mediaUrl(heroImage)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/*
            Three scoped scrims rather than two full-bleed ones.

            The previous pair (a /80→/85 vertical ramp plus a /70 side wash)
            was tuned for the dark generated artwork; stacked over a bright
            golden-hour photograph they multiplied to near-opaque and drowned
            the light, which is the only reason to use this photo at all.

            Now each scrim earns its place: darken the top strip enough for the
            header, darken the left enough for the headline, and feather the
            bottom into the trust strip. The right-hand third — the sun, the
            water, the balcony — is left essentially untouched.
          */}
          <div className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-brand-900/80 via-brand-900/30 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-brand-900/90 via-brand-900/55 to-brand-900/20 sm:from-brand-900/85 sm:via-brand-900/35 sm:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-brand-900/75 to-transparent" />
        </div>

        <div className="container-site relative pb-24 pt-40 sm:pb-28 sm:pt-52">
          {/*
            The entrance runs in three beats - promise, then the supporting
            line, then the search landing last and lowest. That order is the
            argument this page makes: we sell stock we actually hold, so the
            search box is the product rather than a banner sitting on one.

            The headline clears its own mask instead of sliding in from
            nowhere, so it reads as being revealed rather than delivered.
          */}
          <h1 className="display motion-hero-line max-w-3xl text-[38px] leading-[1.06] text-white sm:text-[58px]">
            {t("home.heroTitle")}
          </h1>
          <p className="motion-hero-sub mt-5 max-w-xl text-[17px] leading-relaxed text-white/80">
            {t("home.heroSubtitle")}
          </p>

          <div className="motion-hero-search mt-10">
            <SearchWidget variant="hero" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ trust strip */}
      <section className="border-b border-ink-100/70 bg-white">
        <ul className="container-site grid divide-y divide-ink-100/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-ink-100/70">
          {[
            { Icon: MapPin, title: t("home.trustOffice"), body: contact.streetAddress },
            { Icon: Phone, title: t("home.trustPhone"), body: contact.phone },
            { Icon: MessageCircle, title: "WhatsApp", body: contact.officeHours || t("home.trustHours") },
            {
              Icon: Smartphone,
              title: locale === "fr" ? "Paiement" : "Payment",
              body: "Mobile money · Carte · Espèces"
            }
          ].map(({ Icon, title, body }) => (
            <li key={title} className="flex items-center gap-3.5 py-5 lg:px-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 ring-1 ring-brand-100 ring-inset">
                <Icon className="size-4.5 text-brand-500" />
              </span>
              <div className="min-w-0">
                <p className="eyebrow text-ink-300">{title}</p>
                <p className="truncate text-sm font-medium text-ink-900">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ deals */}
      <section className="container-site py-16">
        {deals.length === 0 ? (
          <>
            <SectionHeading
              title={t("home.deals")}
              subtitle={t("home.dealsSub")}
              href="/flights"
              cta={t("home.viewAll")}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <Carousel
            label={t("home.deals")}
            title={t("home.deals")}
            subtitle={t("home.dealsSub")}
            href="/flights"
            cta={t("home.viewAll")}
          >
            {deals.map((l) => (
              <DealTile key={l.id} listing={l} />
            ))}
          </Carousel>
        )}
      </section>

      {/* ------------------------------------------------------ inspiration */}
      <section className="wash-dark py-16">
        <div className="container-site">
          <Carousel
            label={locale === "fr" ? "Inspiration" : "Inspiration"}
            itemClassName="w-[260px] sm:w-[300px]"
            tone="dark"
            title={locale === "fr" ? "Des idées pour partir" : "Ideas worth travelling for"}
            subtitle={
              locale === "fr"
                ? "Six façons de voir le pays, choisies parmi ce que nous avons réellement en stock."
                : "Six ways to see the country, chosen from what we actually hold."
            }
          >
            {INSPIRATION.map((item) => (
              <Link
                key={item.href + item.fr.title}
                href={item.href}
                className="group relative block aspect-4/5 overflow-hidden rounded-xl2 ring-1 ring-white/10 transition-shadow hover:shadow-xl"
              >
                <Image
                  src={mediaUrl(item.image)}
                  alt=""
                  fill
                  sizes="300px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                />
                <div className="absolute inset-0 bg-linear-to-t from-brand-900 via-brand-900/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="eyebrow text-accent-500">{item[l].kicker}</p>
                  <p className="display mt-1.5 text-[19px] leading-tight text-white">
                    {item[l].title}
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-white/70">{item[l].body}</p>
                </div>
              </Link>
            ))}
          </Carousel>
        </div>
      </section>

      {/* ----------------------------------------------------- destinations */}
      <section className="container-site py-16">
        <SectionHeading
          title={t("home.destinations")}
          subtitle={t("home.destinationsSub")}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* The office's serviced list, not a constant in this bundle. */}
          {destinations.slice(0, 8).map((c) => (
            <DestinationTile
              key={c.slug}
              city={{
                slug: c.slug,
                name: c.name,
                province: c.province ?? "",
                image: c.image || cityImage(c.name)
              }}
            />
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- hotels */}
      <section className="wash-brand py-16">
        <div className="container-site">
          <SectionHeading
            title={t("nav.hotels")}
            subtitle={
              locale === "fr"
                ? "Chambres achetées à l'avance dans nos établissements partenaires."
                : "Rooms bought in advance at our partner properties."
            }
            href="/hotels"
            cta={t("home.viewAll")}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {hotels.length === 0
              ? Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)
              : hotels.map((h) => <HotelTile key={h.id} hotel={h} />)}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- property */}
      <section className="container-site py-16">
        <SectionHeading
          title={t("home.property")}
          subtitle={t("home.propertySub")}
          href="/property"
          cta={t("home.viewAll")}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {properties.length === 0
            ? Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)
            : properties.map((p) => <PropertyTile key={p.id} listing={p} />)}
        </div>
      </section>

      {/* ---------------------------------------------------- recently seen */}
      <div className="container-site">
        <RecentlyViewed />
      </div>

      {/* -------------------------------------------------------------- why */}
      <section className="container-site py-20">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="display text-[28px] leading-tight text-brand-900 sm:text-[36px]">
            {t("home.whyTitle")}
          </h2>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {why.map(({ Icon, title, body }) => (
            <li key={title} className="surface card-lift flex flex-col p-6">
              <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-brand-900 text-white shadow-sm">
                <Icon className="size-5" />
              </span>
              {/*
                No 01/02/03 counter here. These are four independent reasons,
                not steps - numbering them implies an order the reader is meant
                to follow and there isn't one.
              */}
              <h3 className="mb-2 text-[17px] font-bold leading-snug text-brand-900">
                {t(title)}
              </h3>
              <p className="text-sm leading-relaxed text-ink-500">{t(body)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------- office CTA */}
      <section className="container-site pb-20">
        <div className="wash-dark grid overflow-hidden rounded-xl2 shadow-xl lg:grid-cols-2">
          <div className="p-8 lg:p-12">
            <h2 className="display text-[28px] leading-tight text-white sm:text-[34px]">
              {locale === "fr"
                ? "Vous préférez parler à quelqu'un ?"
                : "Would you rather speak to someone?"}
            </h2>
            <p className="mt-3 max-w-md text-white/75">
              {locale === "fr"
                ? `Passez à notre bureau${contact.city ? ` de ${contact.city}` : ""}, appelez-nous, ou écrivez sur WhatsApp. Nous réservons pour vous et vous payez en espèces sur place si vous le souhaitez.`
                : `Come to our ${contact.city || ""} office, call us, or message on WhatsApp. We book for you and you can pay cash on the spot if you prefer.`}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`tel:${dial(contact.phone)}`} className="btn btn-lg btn-primary">
                <Phone className="size-4" />
                {contact.phone}
              </a>
              <Link
                href="/contact"
                className="btn btn-lg text-white ring-1 ring-white/30 ring-inset hover:bg-white/10"
              >
                {t("footer.contact")}
              </Link>
            </div>
          </div>
          {/*
            Was a river landscape — decorative, and saying nothing about the
            offer. This panel exists to make a physical office feel real, so it
            now shows one, with the address and hours read from Settings rather
            than invented here.
          */}
          {/*
            A real street rather than a drawing: Gare Centrale in Kinshasa, the
            country this agency actually works in. The address and hours stay on
            top of it — the panel's job is still to make a physical office feel
            reachable, and a picture alone would drop the only two facts that
            let someone turn up.
          */}
          <div className="relative min-h-56 overflow-hidden">
            <Image
              src="/img/photos/kinshasa-street.webp"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              className="object-cover"
            />
            {/*
              Two layers. The flat tint pulls the photograph's dusk sky — which
              runs magenta — back into the brand navy so the panel reads as one
              surface rather than a bright rectangle pasted onto a dark card.
              The gradient on top then buys contrast for the address.
            */}
            <div className="absolute inset-0 bg-brand-900/45" aria-hidden />
            <div
              className="absolute inset-0 bg-linear-to-t from-brand-900/95 via-brand-900/45 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-8 text-sm text-white/80">
              <p className="font-semibold text-white">
                {[contact.streetAddress, contact.city].filter(Boolean).join(", ")}
              </p>
              <p className="mt-1">{contact.officeHours || t("home.trustHours")}</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

/**
 * §11.4: SSR/ISR for catalogue pages — these have to rank. One request covers
 * every rail, and `safely` means a dev machine without the API running still
 * produces a page rather than failing the build.
 */
export const getStaticProps: GetStaticProps<Props> = async () => {
  const feed = await safely(() => getHomeFeed(), {
    deals: [],
    properties: [],
    hotels: []
  });

  // ISR (revalidate below) keeps this in step with the admin without a deploy.
  const destinations = await safely(() => getLocations(), []);

  const dropped = HERO_CANDIDATES.find((name) =>
    existsSync(join(process.cwd(), "public", "img", name))
  );
  const heroImage =
    process.env.NEXT_PUBLIC_HERO_IMAGE ||
    (dropped ? `/img/${dropped}` : HERO_FALLBACK);

  return { props: { ...feed, heroImage, destinations }, revalidate: 120 };
};
