import { Breadcrumbs } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { Placeholder, Unavailable } from "@/components/transfers/TransferMap";
import type { TownMapCanvasProps } from "@/components/townMap/TownMapCanvas";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { cityGeo } from "@/lib/catalog";
import { matchLocation, useLocations } from "@/lib/locations";
import { usePrefs } from "@/lib/prefs";
import { pushQuery } from "@/lib/query";
import { getMapPlaces, isMapKind, KIND_LOOK, MAP_KINDS, type MapKind } from "@/lib/townMap";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, MapIcon, MapPinOff, RotateCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const Canvas = dynamic<TownMapCanvasProps>(
  () => import("@/components/townMap/TownMapCanvas").catch(() => ({ default: Unavailable })),
  { ssr: false, loading: () => <Placeholder /> }
);

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/**
 * The town map: every hotel, restaurant, vehicle-sale parking and property the
 * office sells in one town, a pin each. `?city=` picks the town (the office's
 * first one otherwise), `?kind=` the category. All the town's places are read
 * once; the category chips filter them here, so their counts stay whole.
 */
export default function TownMapPage() {
  const { t } = usePrefs();
  const router = useRouter();
  const { data: locations } = useLocations();
  const towns = (locations ?? []).filter((l) => l.kind === "CITY");

  const asked = one(router.query.city);
  const wanted = one(router.query.kind)?.toUpperCase();
  const kind = isMapKind(wanted) ? wanted : undefined;
  // Spelled as the office spells it ("kinshasa" from a results page is Kinshasa).
  const city = router.isReady ? (matchLocation(asked ?? "", towns)?.name ?? asked ?? towns[0]?.name) : undefined;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["map-places", city],
    queryFn: ({ signal }) => getMapPlaces(city!, { signal }),
    enabled: Boolean(city),
    // As the catalogue: a place the office has just published shows within the minute.
    staleTime: 30_000
  });

  const items = data?.items ?? [];
  const countOf = (k?: MapKind) => (k ? items.filter((i) => i.kind === k).length : items.length);
  const shown = kind ? items.filter((i) => i.kind === kind) : items;
  const town = data?.town.name ?? city ?? "";
  const centre =
    data?.town.lat !== undefined && data.town.lng !== undefined
      ? { lat: data.town.lat, lng: data.town.lng }
      : (cityGeo(town) ?? cityGeo("Kinshasa")!);
  const heading = city ? t("map.titleIn", { city: town }) : t("map.title");

  const townOptions = towns.map((l) => ({ value: l.name, label: l.name }));
  if (city && !townOptions.some((o) => o.value === city)) townOptions.push({ value: city, label: city });

  return (
    <Layout title={heading} description={t("map.description")}>
      {/* The section opening the vehicles and transfers pages use. */}
      <div className="bg-brand-900 text-white">
        <div className="container-site py-10 sm:py-14">
          <p className="eyebrow mb-3 flex items-center gap-2 text-accent-500">
            <MapIcon className="size-4" aria-hidden="true" />
            {t("map.nav")}
          </p>
          <h1 className="display max-w-2xl text-[30px] leading-tight sm:text-[40px]">{heading}</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">{t("map.description")}</p>
        </div>
      </div>

      <div className="container-site py-8">
        <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: t("map.nav") }]} />

        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
          {city && (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-ink-500">{t("map.town")}</span>
              <InlineSelect
                ariaLabel={t("map.town")}
                value={city}
                onValueChange={(v) => void pushQuery({ city: v })}
                options={townOptions}
                triggerClassName="rounded-xl px-4 py-2.5 shadow-xs"
              />
            </div>
          )}

          <div role="group" aria-label={t("map.label", { city: town })} className="flex flex-wrap gap-2">
            {[undefined, ...MAP_KINDS].map((k) => {
              const on = kind === k;
              const n = countOf(k);
              const Icon = k ? KIND_LOOK[k].Icon : null;
              return (
                <button
                  key={k ?? "all"}
                  type="button"
                  aria-pressed={on}
                  // An empty category is no choice, unless the link asked for it.
                  disabled={Boolean(data) && !n && !on}
                  onClick={() => void pushQuery({ kind: k })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors ring-inset disabled:opacity-45",
                    on ? "bg-brand-900 text-white ring-brand-900" : "bg-white text-brand-900 ring-ink-100 hover:ring-brand-500"
                  )}
                >
                  {Icon && (
                    <Icon
                      className="size-4"
                      aria-hidden="true"
                      style={{ color: on ? "currentColor" : KIND_LOOK[k!].tint }}
                    />
                  )}
                  {k ? t(`map.chip.${k}`) : t("map.all")}
                  {data && <span className={cn("tnum text-xs", on ? "text-white/70" : "text-ink-500")}>{n}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {isError && !data ? (
          <div className="rounded-card bg-bad-100 p-8 text-center ring-1 ring-bad-600/20 ring-inset">
            <AlertTriangle className="mx-auto mb-3 size-8 text-bad-600" />
            <p className="font-bold text-brand-900">{t("common.error")}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-700">{t("cmp.results.unreachable")}</p>
            <button type="button" onClick={() => refetch()} className="btn btn-md btn-dark mt-5">
              <RotateCw className="size-4" />
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <>
            {data && !shown.length && (
              <div className="mb-4 flex items-start gap-3 rounded-card bg-brand-50 p-4 ring-1 ring-brand-100 ring-inset">
                <MapPinOff className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden="true" />
                <div>
                  <p className="font-bold text-brand-900">{t("map.emptyTitle")}</p>
                  <p className="mt-0.5 text-sm text-ink-700">{t("map.emptyBody")}</p>
                </div>
              </div>
            )}
            {/* `isolate`: Leaflet's panes carry z-indexes up to 1000, which
                would sail over the sticky header. */}
            <div
              role="region"
              aria-label={t("map.label", { city: town })}
              aria-busy={isPending && Boolean(city)}
              className="relative isolate z-0 h-[65vh] min-h-90 overflow-hidden rounded-card bg-brand-100 ring-1 ring-ink-100"
            >
              {city && data ? <Canvas places={shown} town={town} centre={centre} /> : <Placeholder />}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
