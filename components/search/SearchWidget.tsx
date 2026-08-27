import { VERTICAL_SLUGS } from "@/lib/catalog";
import { isUnserviced, useLocations, useRoutes } from "@/lib/locations";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { DateField } from "./DateField";
import { LocationField } from "./LocationField";
import { Vertical } from "@/typescript/interface/domain.interface";
import {
  Building2,
  Bus,
  Car,
  Compass,
  Hotel,
  History,
  MapPinOff,
  Plane,
  Search,
  TrendingUp,
  Users
, UtensilsCrossed } from "lucide-react";
import { getRecentSearches, pushRecentSearch, RecentSearch } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

// Same order as VERTICAL_NAV in the header — the hero tabs and the menu
// disagreeing about what comes first is the kind of small wrongness people
// notice without being able to name.
const TABS: { vertical: Vertical; key: string; Icon: typeof Plane }[] = [
  { vertical: "HOTEL", key: "nav.hotels", Icon: Hotel },
  { vertical: "RESTAURANT", key: "nav.restaurants", Icon: UtensilsCrossed },
  { vertical: "FLIGHT", key: "nav.flights", Icon: Plane },
  { vertical: "BUS", key: "nav.bus", Icon: Bus },
  { vertical: "CAR", key: "nav.cars", Icon: Car },
  { vertical: "PROPERTY", key: "nav.property", Icon: Building2 },
  { vertical: "ACTIVITY", key: "nav.activities", Icon: Compass }
];

const PROPERTY_TYPES = [
  { value: "HOUSE_SALE", fr: "Maison à vendre", en: "House for sale" },
  { value: "LAND_SALE", fr: "Terrain à vendre", en: "Land for sale" },
  { value: "APARTMENT_RENT", fr: "Appartement à louer", en: "Apartment to rent" },
  { value: "HOUSE_RENT", fr: "Maison à louer", en: "House to rent" },
  { value: "LAND_RENT", fr: "Terrain à louer", en: "Land to rent" }
];

const today = () => new Date().toISOString().slice(0, 10);

/** Shared field chrome: a labelled box, the way Booking.com builds its bar. */
function Field({
  label,
  children,
  className,
  as: Tag = "label"
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  /**
   * `div` for anything whose control is a button - a <label> forwards its click
   * to the control inside, so a Radix trigger in one opens and instantly closes.
   */
  as?: "label" | "div";
}) {
  return (
    <Tag
      className={cn(
        "flex min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-lg bg-ink-50/70 px-3.5 py-2.5 ring-1 ring-transparent transition-colors ring-inset hover:bg-ink-50 focus-within:bg-white focus-within:ring-brand-500",
        // A text caret over a control you click, not type into, reads as broken.
        Tag === "label" ? "cursor-text" : "cursor-pointer",
        className
      )}
    >
      <span className="eyebrow text-ink-300">{label}</span>
      {children}
    </Tag>
  );
}

/**
 * Radix Select refuses an item whose value is the empty string - it reserves ""
 * for "nothing selected" and throws if you use it. This form stores "" to mean
 * "no filter", so the two are translated at the boundary rather than changing
 * how the whole widget represents an unset value.
 */
const ANY = "__any";
const toSelect = (v: string) => (v ? v : ANY);
const fromSelect = (v: string) => (v === ANY ? "" : v);

/**
 * The same look as `inputCls`, for a Radix trigger rather than an input.
 *
 * `ring-0` matters: InlineSelect's light tone carries `ring-1 ring-ink-100` for
 * standalone use, and inside a Field that plate already draws the border - so
 * without this the cabin and driver boxes rendered a second outline nested in
 * the first, which is what made them look broken next to their neighbours.
 */
const selectTriggerCls =
  "h-auto data-[size=default]:h-auto w-full justify-between rounded-none border-0 bg-transparent p-0 text-[15px] font-semibold text-ink-900 shadow-none ring-0 hover:bg-transparent focus-visible:ring-0";

export default function SearchWidget({
  // Hotels, matching the tab order and the nav: the first tab being the
  // selected one is what makes the row read as a row rather than a puzzle.
  vertical: initialVertical = "HOTEL",
  variant = "hero",
  initial = {}
}: {
  vertical?: Vertical;
  variant?: "hero" | "compact";
  initial?: Record<string, string>;
}) {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const [vertical, setVertical] = useState<Vertical>(initialVertical);
  const [tripType, setTripType] = useState(initial.tripType || "RETURN");
  const [form, setForm] = useState<Record<string, string>>({
    origin: initial.origin ?? "",
    destination: initial.destination ?? "",
    from: initial.from ?? today(),
    to: initial.to ?? "",
    adults: initial.adults ?? "2",
    children: initial.children ?? "0",
    rooms: initial.rooms ?? "1",
    cabin: initial.cabin ?? "",
    withDriver: initial.withDriver ?? "",
    propertyType: initial.propertyType ?? "",
    maxPrice: initial.maxPrice ?? ""
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /**
   * The serviced list comes from the API, not from a constant compiled into
   * this bundle — the office adds a city and it appears here (§12/§15).
   */
  const { data: locations } = useLocations(vertical);
  const pairVertical = vertical === "FLIGHT" || vertical === "BUS";
  // For a pair product the destinations depend on where you leave from.
  const { data: routes } = useRoutes(vertical, form.origin || undefined);
  const destinations = pairVertical
    ? (routes ?? []).map((r) => r.destination)
    : (locations ?? []);

  const originUnknown = pairVertical && isUnserviced(form.origin, locations);
  const destUnknown = isUnserviced(
    form.destination,
    // Before an origin is chosen there is no route list to judge against, so
    // fall back to "is this a place we serve at all".
    pairVertical && form.origin ? destinations : locations
  );
  const unserviced = originUnknown || destUnknown;

  const [recent, setRecent] = useState<RecentSearch[]>([]);
  // Read after mount: the server has no localStorage, and rendering chips that
  // are not in the server HTML is a hydration mismatch.
  useEffect(() => setRecent(getRecentSearches()), []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // §8: only allow-listed params travel in the URL. No raw filter DSL.
    const allowed: Record<Vertical, string[]> = {
      FLIGHT: ["origin", "destination", "from", "to", "adults", "cabin"],
      HOTEL: ["destination", "from", "to", "adults", "children", "rooms"],
      BUS: ["origin", "destination", "from", "adults"],
      CAR: ["destination", "from", "to", "withDriver"],
      // Restaurants are browsed by city; there are no dates to carry.
      RESTAURANT: ["destination"],
      ACTIVITY: ["destination", "from", "adults"],
      PROPERTY: ["propertyType", "destination", "maxPrice"]
    };
    const params = new URLSearchParams();
    for (const key of allowed[vertical]) {
      if (form[key]) params.set(key, form[key]);
    }
    if (vertical === "FLIGHT") params.set("tripType", tripType);
    /**
     * Somewhere we do not service is still a real customer with real intent.
     * Rather than refusing the search or dumping them on an empty results page
     * that reads as "sold out", the request is carried through and the results
     * page leads with the enquiry form — which also tells the office which
     * cities people keep asking for.
     */
    if (unserviced) params.set("enquiry", "1");
    const href = `/${VERTICAL_SLUGS[vertical]}?${params.toString()}`;

    // Remembered so the next visit starts from where this one left off.
    pushRecentSearch({
      vertical,
      href,
      label:
        [form.origin, form.destination].filter(Boolean).join(" → ") ||
        form.destination ||
        t(TABS.find((tab) => tab.vertical === vertical)!.key)
    });
    router.push(href);
  }


  const guests = (
    <details className="relative min-w-0 flex-1 rounded-lg bg-ink-50/70 transition-colors hover:bg-ink-50 open:bg-white open:ring-1 open:ring-brand-500 open:ring-inset">
      <summary className="flex cursor-pointer list-none flex-col justify-center gap-0.5 px-3.5 py-2.5 marker:hidden">
        <span className="eyebrow text-ink-300">{t("search.guests")}</span>
        <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-900">
          <Users className="size-4 text-ink-500" />
          {form.adults} {t(Number(form.adults) > 1 ? "common.adults" : "common.adult")}
          {Number(form.children) > 0 &&
            ` · ${form.children} ${t(Number(form.children) > 1 ? "common.children" : "common.child")}`}
          {vertical === "HOTEL" && ` · ${form.rooms} ch.`}
        </span>
      </summary>
      <div className="absolute inset-x-0 top-full z-20 mt-1 space-y-4 rounded-card bg-white p-5 shadow-lg ring-1 ring-ink-100 ring-inset">
        {[
          ["adults", "search.adults", 1, 9],
          ...(vertical === "HOTEL" || vertical === "ACTIVITY"
            ? ([["children", "search.children", 0, 6]] as const)
            : []),
          ...(vertical === "HOTEL" ? ([["rooms", "search.rooms", 1, 5]] as const) : [])
        ].map(([key, label, min, max]) => (
          <div key={key as string} className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-ink-700">{t(label as string)}</span>
            <InlineSelect
              ariaLabel={t(label as string)}
              value={form[key as string]}
              onValueChange={(v) => set(key as string, v)}
              options={Array.from(
                { length: (max as number) - (min as number) + 1 },
                (_, i) => ({
                  value: String((min as number) + i),
                  label: String((min as number) + i)
                })
              )}
            />
          </div>
        ))}
      </div>
    </details>
  );

  // Only the homepage widget switches product; see the tablist below.
  const showTabs = variant === "hero";

  return (
    <div className={variant === "hero" ? "" : "bg-brand-900 py-4"}>
      <div className={variant === "hero" ? "" : "container-site"}>
        {/*
          * Vertical tabs, on the homepage only.
          *
          * A results page already IS a vertical - /hotels is the hotel tab. Two
          * ways to change the same thing disagree the moment one of them moves:
          * picking a tab here re-rendered the form in place while the URL, the
          * heading, the breadcrumb and the filter sidebar all still said hotels.
          * Switching product on a results page means navigating to that page,
          * which the header nav already does.
          */}
        {showTabs && (
          <div
            role="tablist"
            aria-label={t("footer.services")}
            className="no-scrollbar -mb-px flex gap-1 overflow-x-auto"
          >
            {TABS.map(({ vertical: v, key, Icon }) => (
              <button
                key={v}
                role="tab"
                type="button"
                aria-selected={vertical === v}
                onClick={() => setVertical(v)}
                // Tabs dock into the panel below rather than floating above it,
                // so the widget reads as one object instead of two.
                className={cn(
                  "relative flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition-colors",
                  vertical === v
                    ? "bg-white text-brand-900"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="size-4" />
                {t(key)}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={submit}
          className={cn(
            "rounded-xl2 bg-white p-2.5 shadow-xl ring-1 ring-brand-900/5",
            // Square only the corner the active tab sits on. With no tabs there
            // is nothing to dock into, so the panel keeps all four.
            showTabs && "rounded-tl-none"
          )}
        >
          {vertical === "FLIGHT" && (
            <fieldset className="flex flex-wrap items-center gap-4 px-2 pb-2 pt-1">
              <legend className="sr-only">{t("search.tripType")}</legend>
              {[
                ["RETURN", "search.return"],
                ["ONE_WAY", "search.oneWay"],
                ["MULTI_CITY", "search.multiCity"]
              ].map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
                  <input
                    type="radio"
                    name="tripType"
                    value={value}
                    checked={tripType === value}
                    onChange={() => setTripType(value)}
                    className="size-4 accent-brand-500"
                  />
                  {t(label)}
                </label>
              ))}
              {tripType === "MULTI_CITY" && (
                // §1.2: multi-city launches as archetype B only. Saying so here
                // is cheaper than a search that always returns nothing.
                <span className="text-xs text-ink-500">
                  {locale === "fr"
                    ? "Multi-destinations : traité sur demande, nous vous recontactons avec un prix ferme."
                    : "Multi-city is handled on request; we come back with a firm price."}
                </span>
              )}
            </fieldset>
          )}

          <div className="flex flex-col gap-1.5 md:flex-row">
            {(vertical === "FLIGHT" || vertical === "BUS") && (
              <>
                <Field as="div" label={t("search.from")}>
                  <LocationField
                    value={form.origin}
                    onChange={(v) => set("origin", v)}
                    options={locations ?? []}
                    placeholder="Kinshasa"
                  />
                </Field>
                <Field as="div" label={t("search.to")}>
                  {/* On a pair product this is the routes out of the chosen
                      origin, not every city we touch. */}
                  <LocationField
                    value={form.destination}
                    onChange={(v) => set("destination", v)}
                    options={destinations}
                    placeholder="Lubumbashi"
                  />
                </Field>
              </>
            )}

            {(vertical === "HOTEL" ||
              vertical === "CAR" ||
              vertical === "ACTIVITY" ||
              vertical === "PROPERTY" ||
              vertical === "RESTAURANT") && (
              <Field as="div" label={t("search.where")} className="md:flex-[1.4]">
                <LocationField
                  value={form.destination}
                  onChange={(v) => set("destination", v)}
                  options={locations ?? []}
                  placeholder={t("search.wherePlaceholder")}
                />
              </Field>
            )}

            {vertical === "PROPERTY" && (
              <Field as="div" label={t("search.propertyType")}>
                <InlineSelect
                  ariaLabel={t("search.propertyType")}
                  value={toSelect(form.propertyType)}
                  onValueChange={(v) => set("propertyType", fromSelect(v))}
                  options={[
                    { value: ANY, label: locale === "fr" ? "Tous les biens" : "All listings" },
                    ...PROPERTY_TYPES.map((p) => ({
                      value: p.value,
                      label: locale === "fr" ? p.fr : p.en
                    }))
                  ]}
                  triggerClassName={selectTriggerCls}
                />
              </Field>
            )}

            {vertical !== "PROPERTY" && vertical !== "RESTAURANT" && (
              <Field
                as="div"
                label={
                  vertical === "HOTEL"
                    ? t("search.checkin")
                    : vertical === "CAR"
                      ? t("search.pickupDate")
                      : t("search.date")
                }
              >
                <DateField
                  value={form.from}
                  onChange={(v) => set("from", v)}
                  placeholder={t("search.date")}
                  locale={locale}
                />
              </Field>
            )}

            {((vertical === "FLIGHT" && tripType === "RETURN") ||
              vertical === "HOTEL" ||
              vertical === "CAR") && (
              <Field
                as="div"
                label={
                  vertical === "HOTEL"
                    ? t("search.checkout")
                    : vertical === "CAR"
                      ? // "Restitution" is the right word for handing a vehicle
                        // back, and the wrong one for a return flight.
                        t("search.returnDate")
                      : t("search.returnFlight")
                }
              >
                <DateField
                  value={form.to}
                  onChange={(v) => set("to", v)}
                  placeholder={t("search.date")}
                  locale={locale}
                  // A return cannot precede the departure.
                  min={form.from || today()}
                />
              </Field>
            )}

            {(vertical === "FLIGHT" ||
              vertical === "HOTEL" ||
              vertical === "BUS" ||
              vertical === "ACTIVITY") &&
              guests}

            {vertical === "FLIGHT" && (
              <Field as="div" label={t("search.cabin")}>
                <InlineSelect
                  ariaLabel={t("search.cabin")}
                  value={toSelect(form.cabin)}
                  onValueChange={(v) => set("cabin", fromSelect(v))}
                  options={[
                    { value: ANY, label: locale === "fr" ? "Toutes" : "Any" },
                    { value: "ECONOMY", label: t("cabin.ECONOMY") },
                    { value: "BUSINESS", label: t("cabin.BUSINESS") }
                  ]}
                  triggerClassName={selectTriggerCls}
                />
              </Field>
            )}

            {vertical === "CAR" && (
              <Field as="div" label={locale === "fr" ? "Chauffeur" : "Driver"}>
                <InlineSelect
                  ariaLabel={locale === "fr" ? "Chauffeur" : "Driver"}
                  value={toSelect(form.withDriver)}
                  onValueChange={(v) => set("withDriver", fromSelect(v))}
                  options={[
                    { value: ANY, label: locale === "fr" ? "Peu importe" : "Either" },
                    { value: "true", label: locale === "fr" ? "Avec chauffeur" : "With driver" },
                    { value: "false", label: locale === "fr" ? "Sans chauffeur" : "Self-drive" }
                  ]}
                  triggerClassName={selectTriggerCls}
                />
              </Field>
            )}

            {vertical === "PROPERTY" && (
              <Field as="div" label={t("search.budget")}>
                <InlineSelect
                  ariaLabel={t("search.budget")}
                  value={toSelect(form.maxPrice)}
                  onValueChange={(v) => set("maxPrice", fromSelect(v))}
                  options={[
                    { value: ANY, label: locale === "fr" ? "Tous budgets" : "Any budget" },
                    { value: "200000", label: "≤ 2 000 $ / mois" },
                    { value: "1000000", label: "≤ 10 000 $" },
                    { value: "20000000", label: "≤ 200 000 $" },
                    { value: "50000000", label: "≤ 500 000 $" }
                  ]}
                  triggerClassName={selectTriggerCls}
                />
              </Field>
            )}

            <button type="submit" className="btn btn-primary h-13 px-7 text-[15px] md:h-auto">
              <Search className="size-5" />
              {t("search.submit")}
            </button>
          </div>

          {/* Said before the search runs, not after an empty page. It is a
              note, not an error: the search still goes through, and the office
              gets a lead out of a city it may want to open. */}
          {unserviced && (
            <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-white/10 px-3.5 py-2.5 text-sm text-white/85 ring-1 ring-white/15 ring-inset">
              <MapPinOff className="mt-0.5 size-4 shrink-0 text-accent-500" />
              <span>
                {locale === "fr"
                  ? `Nous ne desservons pas encore ${originUnknown ? form.origin : form.destination}. Envoyez-nous votre demande et nous revenons vers vous.`
                  : `We do not serve ${originUnknown ? form.origin : form.destination} yet. Send us the request and we will come back to you.`}
              </span>
            </p>
          )}
        </form>

        {/* Recent searches, then popular destinations as a fallback. Both are
            one tap away from a results page, which matters far more on a phone
            than a second row of inputs would. */}
        {variant === "hero" && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {recent.length > 0 ? (
              <>
                <span className="eyebrow mr-1 flex items-center gap-1.5 text-white/60">
                  <History className="size-3.5" />
                  {locale === "fr" ? "Recherches récentes" : "Recent searches"}
                </span>
                {recent.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="animate-fade-in rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 ring-1 ring-white/20 transition-colors ring-inset hover:bg-white/20"
                  >
                    {r.label}
                  </Link>
                ))}
              </>
            ) : (
              <>
                <span className="eyebrow mr-1 flex items-center gap-1.5 text-white/60">
                  <TrendingUp className="size-3.5" />
                  {locale === "fr" ? "Destinations populaires" : "Popular destinations"}
                </span>
                {/* The office's own list, ordered by its `sortOrder` — so the
                    busiest cities lead, and a new one appears here the moment
                    it is added. */}
                {(locations ?? []).slice(0, 5).map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => set("destination", c.name)}
                    className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 ring-1 ring-white/20 transition-colors ring-inset hover:bg-white/20"
                  >
                    {c.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
