import Gallery from "@/components/catalog/Gallery";
import RecentlyViewed, { useRecordView } from "@/components/catalog/RecentlyViewed";
import LeadForm from "@/components/catalog/LeadForm";
import { PROPERTY_LABEL, PropertyTile } from "@/components/catalog/cards";
import { Breadcrumbs, Price } from "@/components/site/bits";
import Layout, { SITE } from "@/components/site/Layout";
import { getListing, getSlugs, safely } from "@/lib/api";
import { mediaUrl, mediaUrls } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Listing } from "@/typescript/interface/domain.interface";
import {
  Bed,
  Bath,
  Check,
  FileCheck2,
  MapPin,
  Maximize,
  MessageCircle,
  Phone,
  Ruler
} from "lucide-react";
import { GetStaticPaths, GetStaticProps } from "next";

interface Props {
  listing: Listing;
  related: Listing[];
}

/**
 * §1.1 archetype C — Enquiry Only.
 *
 * "Do not build a checkout for archetype C." There is deliberately no price
 * box, no quantity selector, no hold and no path into /booking from this
 * page. A qualified lead in the admin CRM is the entire outcome.
 */
export default function PropertyDetail({ listing, related }: Props) {
  const { t, locale, lz } = usePrefs();
  useRecordView(listing.slug);
  const a = listing.attributes;
  const isRent = a.priceBasis === "PER_MONTH";

  return (
    <Layout
      title={lz(listing.title)}
      description={lz(listing.description).slice(0, 300)}
      image={mediaUrl(listing.images[0])}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: lz(listing.title),
        description: lz(listing.description),
        image: mediaUrls(listing.images),
        url: `${SITE}/property/listing/${listing.slug}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: listing.city,
          addressCountry: listing.country
        }
      }}
    >
      <div className="container-site py-6">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.property"), href: "/property" },
            { label: lz(listing.title) }
          ]}
        />

        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block rounded bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              {PROPERTY_LABEL[a.propertyType ?? "HOUSE_SALE"][locale === "en" ? "en" : "fr"]}
            </span>
            <h1 className="display text-2xl leading-tight text-brand-900 sm:text-3xl">
              {lz(listing.title)}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-500">
              <MapPin className="size-4" />
              {listing.city}, RDC
            </p>
          </div>
          <div className="sm:text-right">
            <Price money={listing.sellPrice} className="text-3xl font-bold text-brand-900" />
            <p className="text-sm text-ink-500">
              {isRent ? t("listing.perMonth") : t("listing.total")}
            </p>
          </div>
        </div>

        <Gallery images={listing.images} alt={lz(listing.title)} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-8">
            <section>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {a.bedrooms ? (
                  <Fact Icon={Bed} label={t("results.bedrooms")} value={String(a.bedrooms)} />
                ) : null}
                {a.bathrooms ? (
                  <Fact
                    Icon={Bath}
                    label={locale === "fr" ? "Salles d'eau" : "Bathrooms"}
                    value={String(a.bathrooms)}
                  />
                ) : null}
                {a.areaSqm ? (
                  <Fact
                    Icon={Maximize}
                    label={locale === "fr" ? "Surface habitable" : "Living area"}
                    value={`${a.areaSqm.toLocaleString("fr-FR")} m²`}
                  />
                ) : null}
                {a.plotSizeSqm ? (
                  <Fact
                    Icon={Ruler}
                    label={locale === "fr" ? "Parcelle" : "Plot"}
                    value={`${a.plotSizeSqm.toLocaleString("fr-FR")} m²`}
                  />
                ) : null}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-brand-900">
                {t("listing.description")}
              </h2>
              <p className="text-[15px] leading-relaxed text-ink-700">
                {lz(listing.description)}
              </p>
            </section>

            {a.features && (
              <section>
                <h2 className="mb-3 text-xl font-bold text-brand-900">
                  {t("listing.features")}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {a.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[15px] text-ink-700">
                      <Check className="size-4 shrink-0 text-ok-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {a.titleDeedStatus && (
              <section className="rounded-card bg-ink-50 p-6 ring-1 ring-ink-100 ring-inset">
                <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-brand-900">
                  <FileCheck2 className="size-5 text-brand-500" />
                  {locale === "fr" ? "Situation juridique" : "Legal status"}
                </h2>
                <p className="text-[15px] text-ink-700">{a.titleDeedStatus}</p>
                <p className="mt-2 text-sm text-ink-500">
                  {locale === "fr"
                    ? "Les documents originaux sont consultables chez le notaire avant toute transaction. Nous vous accompagnons à la vérification."
                    : "Original documents can be inspected at the notary before any transaction. We accompany you to the verification."}
                </p>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-xl font-bold text-brand-900">
                {t("listing.location")}
              </h2>
              <div className="relative h-44 overflow-hidden rounded-card ring-1 ring-ink-100 ring-inset bg-brand-100">
                <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#1e5a8e_1px,transparent_1px),linear-gradient(90deg,#1e5a8e_1px,transparent_1px)] [background-size:32px_32px]" />
                <MapPin className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-brand-900" />
              </div>
              <p className="mt-2 text-sm text-ink-500">
                {locale === "fr"
                  ? "L'adresse exacte est communiquée à la prise de rendez-vous."
                  : "The exact address is given when a viewing is arranged."}
              </p>
            </section>
          </div>

          {/* Enquiry rail — the only conversion path on this page. */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="surface p-6">
              <h2 className="text-lg font-bold text-brand-900">{t("enquiry.title")}</h2>
              <p className="mb-4 mt-1 text-sm text-ink-500">{t("enquiry.body")}</p>

              <div className="mb-4 flex items-center gap-3 rounded-lg bg-brand-50 p-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-brand-900 text-sm font-bold text-white">
                  JM
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t("listing.agent")}
                  </p>
                  <p className="font-bold text-brand-900">Joseph Mukendi</p>
                </div>
              </div>

              <div className="mb-4 flex gap-2">
                <a
                  href="tel:+243810000000"
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-brand-500 px-3 py-2.5 text-sm font-semibold text-brand-500 hover:bg-brand-50"
                >
                  <Phone className="size-4" />
                  {t("enquiry.callNow")}
                </a>
                <a
                  href={`https://wa.me/243810000000?text=${encodeURIComponent(lz(listing.title))}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-brand-500 px-3 py-2.5 text-sm font-semibold text-brand-500 hover:bg-brand-50"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </div>

              <LeadForm
                kind="PROPERTY"
                vertical="PROPERTY"
                listingLabel={lz(listing.title)}
                compact
                defaultMessage={
                  locale === "fr"
                    ? `Bonjour, je souhaite des informations sur : ${lz(listing.title)}.`
                    : `Hello, I would like information about: ${lz(listing.title)}.`
                }
              />

              <p className="mt-3 text-xs text-ink-500">
                {locale === "fr"
                  ? "Aucun paiement en ligne pour l'immobilier. Tout se traite avec notre agent."
                  : "No online payment for property. Everything is handled with our agent."}
              </p>
            </div>
          </aside>
        </div>

        <RecentlyViewed excludeSlug={listing.slug} />

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-bold text-brand-900">
              {locale === "fr" ? "Biens similaires" : "Similar listings"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <PropertyTile key={r.id} listing={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

function Fact({
  Icon,
  label,
  value
}: {
  Icon: typeof Bed;
  label: string;
  value: string;
}) {
  return (
    <li className="surface p-5">
      <Icon className="mb-2 size-5 text-brand-500" />
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="text-lg font-bold text-brand-900">{value}</p>
    </li>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { listings } = await safely(() => getSlugs(), { listings: [], hotels: [] });
  return {
    paths: listings
      .filter((l) => l.vertical === "PROPERTY")
      .map((l) => ({ params: { slug: l.slug } })),
    fallback: "blocking"
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  try {
    const { listing, related } = await getListing(String(params?.slug));
    return { props: { listing, related }, revalidate: 300 };
  } catch {
    return { notFound: true, revalidate: 60 };
  }
};
