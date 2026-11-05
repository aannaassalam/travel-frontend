import Gallery, { PhotoGrid } from "@/components/catalog/Gallery";
import ListingVideo from "@/components/catalog/ListingVideo";
import LocationMap from "@/components/catalog/LocationMap";
import { Breadcrumbs, PolicyLine, Price, PromoEnds, PromoWas, SettlementNote } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { getVehicle, type VehicleDetail } from "@/lib/api";
import { km, specText, vehicleHref } from "@/lib/catalog";
import { dial } from "@/lib/contact";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CarFront,
  Check,
  Clock,
  Gauge,
  MapPin,
  Phone,
  Settings2,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

/**
 * One vehicle for sale: the gallery, the key facts, the specifications table
 * and the accessories ticked or greyed — the used-car stock page's pattern in
 * this site's parts — then where it is collected. A reserved or sold vehicle
 * still opens (a shared link must not 404), says so, and cannot be ordered.
 */
export default function VehiclePage() {
  const router = useRouter();
  const stockRef = String(router.query.stockRef ?? "");
  const { t, lz, locale } = usePrefs();

  const { data: v, isPending, isError } = useQuery({
    queryKey: ["vehicle", stockRef],
    queryFn: ({ signal }) => getVehicle(stockRef, { signal }),
    enabled: Boolean(stockRef),
    // Re-read when the page opens again: price, promotion and availability change.
    refetchOnMount: true,
    staleTime: 30_000
  });

  if (isPending || !v) {
    return (
      <Layout title={t("nav.vehicles")} description="" noindex={isError}>
        <div className="container-site py-16 text-center text-ink-500">
          {isError ? t("pg.vehicle.notFound") : t("common.loading")}
        </div>
      </Layout>
    );
  }

  const title = lz(v.title);
  const p = v.parking;
  const available = v.availability === "AVAILABLE";
  const sold = v.availability === "SOLD";
  const condition = v.condition ? t(`cmp.vehicle.${v.condition}`) : "";

  const facts = [
    { Icon: CalendarDays, label: t("cmp.vehicle.year"), value: v.year ? String(v.year) : "" },
    { Icon: Gauge, label: t("cmp.vehicle.mileage"), value: v.mileageKm != null ? km(v.mileageKm, locale) : "" },
    { Icon: BadgeCheck, label: t("cmp.vehicle.condition"), value: condition },
    { Icon: CarFront, label: t("cmp.vehicle.type"), value: lz(v.vehicleType?.name) },
    ...(v.cardSpecs ?? []).map((s) => ({ Icon: Settings2, label: lz(s.name), value: specText(s, locale) }))
  ].filter((f) => f.value);

  // The whole sheet, the basics first: the table a buyer reads line by line.
  const rows = [
    [t("cmp.vehicle.stockRef"), v.stockRef],
    [t("cmp.vehicle.make"), v.make],
    [t("cmp.vehicle.model"), v.model],
    [t("cmp.vehicle.year"), v.year ? String(v.year) : ""],
    [t("cmp.vehicle.mileage"), v.mileageKm != null ? km(v.mileageKm, locale) : ""],
    [t("cmp.vehicle.condition"), condition],
    [t("cmp.vehicle.type"), lz(v.vehicleType?.name)],
    [t("cmp.vehicle.colour"), v.colour ?? ""],
    ...v.specs.map((s) => [lz(s.name), specText(s, locale)])
  ].filter(([, value]) => value);

  return (
    <Layout title={`${title} — ${v.city}`} description={lz(v.description).slice(0, 300)} image={mediaUrl(v.images[0])}>
      <div className="container-site py-6">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.vehicles"), href: "/vehicles" },
            { label: v.city, href: `/vehicles?city=${encodeURIComponent(v.city)}` },
            { label: title }
          ]}
        />

        <div className="mb-4">
          <h1 className="display text-2xl leading-tight text-brand-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-mono text-ink-500" dir="ltr">
              {v.stockRef}
            </span>
            <span className="flex items-center gap-1.5 text-brand-500">
              <MapPin className="size-4" />
              {[lz(p.name), v.city].filter(Boolean).join(", ")}
            </span>
          </p>
        </div>

        {!available && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl bg-warn-100 px-5 py-4 ring-1 ring-warn-600/30 ring-inset"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn-600" />
            <p className="text-sm text-ink-900">
              <strong className="font-semibold">{t(sold ? "pg.vehicle.sold" : "pg.vehicle.reserved")}</strong> —{" "}
              {t(sold ? "pg.vehicle.soldBody" : "pg.vehicle.reservedBody")}
            </p>
          </div>
        )}

        <Gallery images={v.images} alt={title} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-10">
            {facts.length > 0 && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {facts.map(({ Icon, label, value }) => (
                  <div key={label} className="surface p-4">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                      <Icon className="size-3.5" />
                      {label}
                    </dt>
                    <dd className="mt-1 text-[15px] font-medium text-ink-900">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <section>
              <h2 className="mb-3 text-xl font-bold text-brand-900">{t("pg.vehicle.specs")}</h2>
              <dl className="overflow-hidden rounded-md ring-1 ring-ink-100">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex gap-4 px-4 py-2.5 text-sm odd:bg-white even:bg-ink-50">
                    <dt className="w-2/5 shrink-0 font-semibold text-ink-500 sm:w-48">{label}</dt>
                    <dd className="min-w-0 font-medium text-ink-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <Accessories vehicle={v} />

            {lz(v.description) && (
              <section>
                <h2 className="mb-3 text-xl font-bold text-brand-900">{t("listing.description")}</h2>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{lz(v.description)}</p>
              </section>
            )}

            <ListingVideo url={v.videoUrl} poster={v.images[0]} title={title} />
            <PhotoGrid images={v.images} alt={title} />

            {/* No delivery: the customer collects it here. */}
            <section>
              <h2 className="mb-4 text-xl font-bold text-brand-900">{t("cmp.pickup.title")}</h2>
              <div className="overflow-hidden rounded-card ring-1 ring-ink-100 ring-inset">
                <LocationMap
                  geo={p.geo}
                  city={p.city}
                  label={[lz(p.name), p.address].filter(Boolean).join(" — ")}
                  className="h-64"
                />
                <div className="space-y-2 p-5 text-[15px] text-ink-700">
                  <p className="font-bold text-brand-900">{lz(p.name)}</p>
                  <p className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" />
                    {[p.address, p.city].filter(Boolean).join(", ")}
                  </p>
                  {lz(p.openingHours) && (
                    <p className="flex gap-2">
                      <Clock className="mt-0.5 size-4 shrink-0 text-brand-500" />
                      {lz(p.openingHours)}
                    </p>
                  )}
                  {p.phone && (
                    <a href={`tel:${dial(p.phone)}`} className="flex gap-2 hover:underline">
                      <Phone className="mt-0.5 size-4 shrink-0 text-brand-500" />
                      <span dir="ltr">{p.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="lg:sticky lg:top-header lg:h-fit">
            <div className="surface p-6">
              <p className="text-sm text-ink-500">{t("pg.vehicle.price")}</p>
              {available ? (
                <>
                  <PromoWas promotion={v.promotion} />
                  <Price money={v.sellPrice} className="display block text-[32px] leading-tight text-brand-900" />
                  <PromoEnds promotion={v.promotion} />
                  <div className="mt-2">
                    <SettlementNote money={v.sellPrice} />
                  </div>
                  <Link href={`${vehicleHref(v)}/order`} className="btn btn-lg btn-primary mt-4 w-full">
                    {t("pg.vehicle.order")}
                  </Link>
                  <p className="mt-3 text-xs text-ink-500">{t("pg.vehicle.orderNote")}</p>
                  <PolicyLine className="mt-3 text-xs" />
                </>
              ) : (
                <>
                  <Price money={v.sellPrice} className="block text-3xl font-bold text-ink-300 line-through" />
                  <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-700">
                    {t(sold ? "pg.vehicle.sold" : "pg.vehicle.reserved")}
                  </p>
                  <Link href="/vehicles" className="btn btn-md btn-outline mt-4 w-full">
                    {t("pg.vehicle.seeOthers")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/** Every accessory the office lists, by group: this one's ticked, the rest greyed. */
function Accessories({ vehicle }: { vehicle: VehicleDetail }) {
  const { t, lz } = usePrefs();
  if (!vehicle.accessories.length) return null;
  const groups = new Map<string, VehicleDetail["accessories"]>();
  for (const a of vehicle.accessories) {
    const g = lz(a.group) || t("cmp.vehicle.otherAccessories");
    groups.set(g, [...(groups.get(g) ?? []), a]);
  }
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-brand-900">{t("cmp.vehicle.accessories")}</h2>
      <div className="space-y-5">
        {[...groups].map(([group, items]) => (
          <div key={group}>
            {groups.size > 1 && <h3 className="mb-2 text-sm font-bold text-ink-700">{group}</h3>}
            <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <li
                  key={a.key}
                  className={cn("flex items-center gap-2 text-sm", a.has ? "font-medium text-ink-900" : "text-ink-300")}
                >
                  {a.has ? (
                    <Check className="size-4 shrink-0 text-ok-600" aria-hidden="true" />
                  ) : (
                    <X className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
                  )}
                  {lz(a.name)}
                  <span className="sr-only">— {t(a.has ? "cmp.vehicle.has" : "cmp.vehicle.hasNot")}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
