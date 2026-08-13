import { VERTICAL_SLUGS } from "@/lib/catalog";
import { isUnserviced, useLocations, useRoutes } from "@/lib/locations";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import { getRecentSearches, pushRecentSearch, RecentSearch } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const TABS: { vertical: Vertical; key: string; Icon: typeof Plane }[] = [
  { vertical: "FLIGHT", key: "nav.flights", Icon: Plane },
  { vertical: "HOTEL", key: "nav.hotels", Icon: Hotel },
  { vertical: "BUS", key: "nav.bus", Icon: Bus },
  { vertical: "CAR", key: "nav.cars", Icon: Car },
  { vertical: "ACTIVITY", key: "nav.activities", Icon: Compass },
  { vertical: "PROPERTY", key: "nav.property", Icon: Building2 }
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
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 flex-1 cursor-text flex-col justify-center gap-0.5 rounded-lg bg-ink-50/70 px-3.5 py-2.5 ring-1 ring-transparent transition-colors ring-inset hover:bg-ink-50 focus-within:bg-white focus-within:ring-brand-500",
        className
      )}
    >
      <span className="eyebrow text-ink-300">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-300";

export default function SearchWidget({
  vertical: initialVertical = "FLIGHT",
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

  const cityList = (
    <>
      <datalist id="city-list">
        {(locations ?? []).map((c) => (
          <option key={c.slug} value={c.name} />
        ))}
      </datalist>
      {/* Separate list for the "to" box: on a flight or a coach it is the
          routes out of the chosen origin, not every city we touch. */}
      <datalist id="destination-list">
        {destinations.map((c) => (
          <option key={c.slug} value={c.name} />
        ))}
      </datalist>
    </>
  );

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
          <label key={key as string} className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-ink-700">{t(label as string)}</span>
            <select
              value={form[key as string]}
              onChange={(e) => set(key as string, e.target.value)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-xs ring-1 ring-ink-100 ring-inset"
            >
              {Array.from({ length: (max as number) - (min as number) + 1 }, (_, i) => (
                <option key={i} value={String((min as number) + i)}>
                  {(min as number) + i}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </details>
  );

  return (
    <div className={variant === "hero" ? "" : "bg-brand-800 py-4"}>
      <div className={variant === "hero" ? "" : "container-site"}>
        {/* Vertical tabs */}
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

        <form
          onSubmit={submit}
          className="rounded-xl2 rounded-tl-none bg-white p-2.5 shadow-xl ring-1 ring-brand-900/5"
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
                <Field label={t("search.from")}>
                  <input
                    className={inputCls}
                    list="city-list"
                    value={form.origin}
                    onChange={(e) => set("origin", e.target.value)}
                    placeholder="Kinshasa"
                  />
                </Field>
                <Field label={t("search.to")}>
                  <input
                    className={inputCls}
                    list="destination-list"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    placeholder="Lubumbashi"
                  />
                </Field>
              </>
            )}

            {(vertical === "HOTEL" ||
              vertical === "CAR" ||
              vertical === "ACTIVITY" ||
              vertical === "PROPERTY") && (
              <Field label={t("search.where")} className="md:flex-[1.4]">
                <input
                  className={inputCls}
                  list="city-list"
                  value={form.destination}
                  onChange={(e) => set("destination", e.target.value)}
                  placeholder={t("search.wherePlaceholder")}
                />
              </Field>
            )}

            {vertical === "PROPERTY" && (
              <Field label={t("search.propertyType")}>
                <select
                  className={inputCls}
                  value={form.propertyType}
                  onChange={(e) => set("propertyType", e.target.value)}
                >
                  <option value="">{locale === "fr" ? "Tous les biens" : "All listings"}</option>
                  {PROPERTY_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {locale === "fr" ? p.fr : p.en}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {vertical !== "PROPERTY" && (
              <Field
                label={
                  vertical === "HOTEL"
                    ? t("search.checkin")
                    : vertical === "CAR"
                      ? t("search.pickupDate")
                      : t("search.date")
                }
              >
                {/* Native date input: correct on mobile, localised for free, no
                    picker dependency and no 40 KB of JS on a metered network. */}
                <input
                  type="date"
                  className={inputCls}
                  value={form.from}
                  min={today()}
                  onChange={(e) => set("from", e.target.value)}
                />
              </Field>
            )}

            {((vertical === "FLIGHT" && tripType === "RETURN") ||
              vertical === "HOTEL" ||
              vertical === "CAR") && (
              <Field
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
                <input
                  type="date"
                  className={inputCls}
                  value={form.to}
                  min={form.from || today()}
                  onChange={(e) => set("to", e.target.value)}
                />
              </Field>
            )}

            {(vertical === "FLIGHT" ||
              vertical === "HOTEL" ||
              vertical === "BUS" ||
              vertical === "ACTIVITY") &&
              guests}

            {vertical === "FLIGHT" && (
              <Field label={t("search.cabin")}>
                <select
                  className={inputCls}
                  value={form.cabin}
                  onChange={(e) => set("cabin", e.target.value)}
                >
                  <option value="">{locale === "fr" ? "Toutes" : "Any"}</option>
                  <option value="ECONOMY">{t("cabin.ECONOMY")}</option>
                  <option value="BUSINESS">{t("cabin.BUSINESS")}</option>
                </select>
              </Field>
            )}

            {vertical === "CAR" && (
              <Field label={locale === "fr" ? "Chauffeur" : "Driver"}>
                <select
                  className={inputCls}
                  value={form.withDriver}
                  onChange={(e) => set("withDriver", e.target.value)}
                >
                  <option value="">{locale === "fr" ? "Peu importe" : "Either"}</option>
                  <option value="true">{locale === "fr" ? "Avec chauffeur" : "With driver"}</option>
                  <option value="false">{locale === "fr" ? "Sans chauffeur" : "Self-drive"}</option>
                </select>
              </Field>
            )}

            {vertical === "PROPERTY" && (
              <Field label={t("search.budget")}>
                <select
                  className={inputCls}
                  value={form.maxPrice}
                  onChange={(e) => set("maxPrice", e.target.value)}
                >
                  <option value="">{locale === "fr" ? "Tous budgets" : "Any budget"}</option>
                  <option value="200000">≤ 2 000 $ / mois</option>
                  <option value="1000000">≤ 10 000 $</option>
                  <option value="20000000">≤ 200 000 $</option>
                  <option value="50000000">≤ 500 000 $</option>
                </select>
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
        {cityList}

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
