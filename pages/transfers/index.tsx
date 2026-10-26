import { Breadcrumbs, Price } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import { PlaceField } from "@/components/transfers/PlaceField";
import TransferMap from "@/components/transfers/TransferMap";
import { DateField, SelectField, TextAreaField } from "@/components/ui/field";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { ApiError } from "@/lib/api";
import { useCheckout } from "@/lib/checkout";
import { formatMinutes } from "@/lib/format";
import { useLocations } from "@/lib/locations";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import {
  fmtAt,
  fmtKm,
  getTransferCategories,
  inDrc,
  isoAt,
  maxBookableDate,
  minBookableAt,
  placeText,
  quoteTransfer,
  slotsOn,
  transferRefusalKey,
  type TransferQuoteRequest
} from "@/lib/transfers";
import { cn } from "@/lib/utils";
import type { TransferMode, TransferPoint } from "@/typescript/interface/domain.interface";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CarTaxiFront, Check, Clock, Loader2, Route, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

/**
 * Booking a ride with a driver, step by step in one card: the city, journey or
 * hourly, the two points, when and who, then the map and the price of each
 * vehicle category. The price exists only once both points are set, and only
 * as the server quotes it; "Réserver" hands the quote request to the ordinary
 * checkout, which has the server price it again.
 */

const PASSENGER_MAX = 8;
const HOURS_MAX = 12;

/** A map tap, rounded to about a metre: more digits are noise in a label. */
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-900 text-sm font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="mb-3 text-base font-bold text-brand-900">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default function TransfersPage() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const { start } = useCheckout();

  const { data: locations, isPending: citiesPending } = useLocations("TRANSFER");
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<TransferMode>("DISTANCE");
  const [pickup, setPickup] = useState<TransferPoint>();
  const [dropoff, setDropoff] = useState<TransferPoint>();
  const [picking, setPicking] = useState<"pickup" | "dropoff" | null>(null);
  const [pickError, setPickError] = useState("");
  /** The earliest bookable moment — read after mount: it is "now", which the server render cannot share. */
  const [min, setMin] = useState<{ date: string; time: string }>();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [hours, setHours] = useState(2);
  const [passengers, setPassengers] = useState(1);
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState<string>();

  useEffect(() => {
    const m = minBookableAt();
    setMin(m);
    setDate(m.date);
    setTime(m.time);
  }, []);

  // The search bar's `destination` and `from` (and a plain ?city=) prefill; else the first city.
  useEffect(() => {
    if (city || !router.isReady || !locations?.length) return;
    const wanted = String(router.query.city ?? router.query.destination ?? "").toLowerCase();
    const hit = locations.find((l) => l.name.toLowerCase() === wanted);
    setCity((hit ?? locations[0]).name);
    const from = String(router.query.from ?? "");
    // Read afresh rather than from `min`: that state lands a render later, and
    // this effect does not run again once the city is set.
    if (/^\d{4}-\d{2}-\d{2}$/.test(from) && from > minBookableAt().date && from <= maxBookableDate()) {
      setDate(from);
    }
  }, [city, router.isReady, router.query, locations]);

  // A date earlier than the slot allows pulls the time back to the first one.
  const slots = useMemo(() => (min && date ? slotsOn(date, min) : []), [min, date]);
  useEffect(() => {
    if (slots.length && !slots.includes(time)) setTime(slots[0]);
  }, [slots, time]);

  const changeCity = (next: string) => {
    setCity(next);
    // Places belong to a city; the points chosen in the old one are not in this one.
    setPickup(undefined);
    setDropoff(undefined);
    setPicking(null);
  };

  const changeMode = (next: TransferMode) => {
    setMode(next);
    if (next === "HOURLY") {
      setDropoff(undefined);
      if (picking === "dropoff") setPicking(null);
    }
  };

  const onPick = picking
    ? (p: { lat: number; lng: number }) => {
        if (!inDrc(p)) return setPickError(t("transfer.err.outsideDrc"));
        setPickError("");
        const point = {
          label: `${t("transfer.mapPoint")} (${round5(p.lat)}, ${round5(p.lng)})`,
          lat: round5(p.lat),
          lng: round5(p.lng)
        };
        (picking === "pickup" ? setPickup : setDropoff)(point);
        setPicking(null);
      }
    : undefined;

  const { data: categories = [] } = useQuery({
    queryKey: ["transfer-categories", city],
    queryFn: ({ signal }) => getTransferCategories(city, { signal }),
    enabled: Boolean(city),
    staleTime: 5 * 60_000
  });

  const at = date && time ? isoAt(date, time) : "";
  const complete = Boolean(city && pickup && at && (mode === "HOURLY" ? hours : dropoff));
  const body: TransferQuoteRequest | null = complete
    ? {
        city,
        mode,
        pickup: pickup!,
        dropoff: mode === "DISTANCE" ? dropoff : undefined,
        at,
        hours: mode === "HOURLY" ? hours : undefined,
        passengers
      }
    : null;
  const quote = useQuery({
    queryKey: ["transfer-quote", body],
    queryFn: () => quoteTransfer(body!),
    enabled: Boolean(body),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 0
  });

  // A category that stopped fitting (more passengers) is no longer the choice.
  const quotes = useMemo(() => quote.data?.quotes ?? [], [quote.data]);
  useEffect(() => {
    if (categoryId && quotes.length && !quotes.some((q) => q.categoryId === categoryId && q.available)) {
      setCategoryId(undefined);
    }
  }, [quotes, categoryId]);

  // The server says which box is wrong when it can; the generic line otherwise.
  const quoteErrorKey =
    transferRefusalKey(quote.error instanceof ApiError ? quote.error.code : undefined) ??
    "transfer.quoteFailed";
  // The first slot was worked out when the page opened; a customer who lingered
  // is quoted a time that has passed. Moving the floor forward pulls the time
  // to the next bookable slot (the effect above), which quotes again.
  useEffect(() => {
    if (quote.error instanceof ApiError && quote.error.code === "INVALID_TIME") setMin(minBookableAt());
  }, [quote.error]);

  function book() {
    const q = quotes.find((x) => x.categoryId === categoryId);
    // Never the previous request's prices for this one: wait for its own quote.
    if (!body || !q || !pickup || quote.isPlaceholderData) return;
    const cat = categories.find((c) => c.id === q.categoryId);
    start({
      vertical: "TRANSFER",
      listingSlug: "",
      listingId: "",
      label:
        mode === "DISTANCE"
          ? t("transfer.label", { from: pickup.label, to: dropoff?.label ?? "" })
          : t("transfer.labelHourly", { from: pickup.label, n: hours }),
      sublabel: fmtAt(at, locale),
      image: cat?.image || "/img/car-1.svg",
      unitPrice: q.price,
      quantity: 1,
      units: 1,
      unitNoun: "unit",
      startDate: at,
      // One traveller line per passenger, as for a bus.
      adults: passengers,
      transfer: { ...body, categoryId: q.categoryId, notes: notes.trim() || undefined },
      transferInfo: {
        category: placeText(q.name, locale),
        distanceKm: mode === "DISTANCE" ? quote.data?.distanceKm : undefined,
        durationMinutes: mode === "DISTANCE" ? quote.data?.durationMinutes : undefined
      }
    });
    router.push("/booking/travellers");
  }

  const count = (n: number, from = 1) =>
    Array.from({ length: n - from + 1 }, (_, i) => ({ value: String(from + i), label: String(from + i) }));

  return (
    <Layout title={t("transfer.title")} description={t("transfer.description")}>
      <div className="bg-brand-900 text-white">
        <div className="container-site py-10 sm:py-14">
          <p className="eyebrow mb-3 flex items-center gap-2 text-accent-500">
            <CarTaxiFront className="size-4" aria-hidden="true" />
            {t("nav.transfers")}
          </p>
          <h1 className="display max-w-2xl text-[30px] leading-tight sm:text-[40px]">
            {t("transfer.title")}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">{t("transfer.intro")}</p>
        </div>
      </div>

      <div className="container-site py-8">
        <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: t("nav.transfers") }]} />

        <div className="surface grid gap-10 p-6 sm:p-8 lg:grid-cols-[1fr_440px]">
          <div className="space-y-8">
            <Step n={1} title={t("transfer.step.city")}>
              {locations?.length ? (
                <InlineSelect
                  ariaLabel={t("transfer.step.city")}
                  value={city}
                  onValueChange={changeCity}
                  options={locations.map((l) => ({ value: l.name, label: l.name }))}
                  triggerClassName="w-full justify-between sm:w-72"
                />
              ) : (
                <p className="text-sm text-ink-500">
                  {citiesPending ? `${t("common.loading")}…` : t("transfer.noCities")}
                </p>
              )}
            </Step>

            <Step n={2} title={t("transfer.step.mode")}>
              {/* Two toggle buttons, like the category cards: each is a tab stop
                  and Space/Enter picks it. Not a radiogroup, whose arrow-key
                  contract these plain buttons would not honour. */}
              <div role="group" aria-label={t("transfer.step.mode")} className="grid gap-3 sm:grid-cols-2">
                {(["DISTANCE", "HOURLY"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => changeMode(m)}
                    className={cn(
                      "rounded-xl p-4 text-left ring-1 ring-inset transition-colors",
                      mode === m ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white ring-ink-100 hover:bg-ink-50"
                    )}
                  >
                    <span className="flex items-center gap-2 font-bold text-brand-900">
                      {m === "DISTANCE" ? (
                        <Route className="size-4 text-brand-500" aria-hidden="true" />
                      ) : (
                        <Clock className="size-4 text-brand-500" aria-hidden="true" />
                      )}
                      {t(`transfer.mode.${m}`)}
                    </span>
                    <span className="mt-1 block text-sm text-ink-500">
                      {t(m === "DISTANCE" ? "transfer.modeDistanceHint" : "transfer.modeHourlyHint")}
                    </span>
                  </button>
                ))}
              </div>
            </Step>

            <Step n={3} title={mode === "DISTANCE" ? t("transfer.step.points") : t("transfer.pickup")}>
              <div className="space-y-3">
                <PlaceField
                  // Remounted per city: its places and its typed text belong to one.
                  key={`pickup-${city}`}
                  city={city}
                  label={t("transfer.pickup")}
                  value={pickup}
                  onChange={setPickup}
                  picking={picking === "pickup"}
                  onPickOnMap={() => setPicking((p) => (p === "pickup" ? null : "pickup"))}
                />
                {mode === "DISTANCE" ? (
                  <PlaceField
                    key={`dropoff-${city}`}
                    city={city}
                    label={t("transfer.dropoff")}
                    value={dropoff}
                    onChange={setDropoff}
                    picking={picking === "dropoff"}
                    onPickOnMap={() => setPicking((p) => (p === "dropoff" ? null : "dropoff"))}
                  />
                ) : (
                  <SelectField
                    label={t("transfer.hours")}
                    value={String(hours)}
                    onValueChange={(v) => setHours(Number(v))}
                    options={count(HOURS_MAX).map((o) => ({ ...o, label: `${o.label} h` }))}
                  />
                )}
                {pickError && (
                  <p role="alert" className="text-sm font-medium text-bad-600">
                    {pickError}
                  </p>
                )}
                <p className="text-xs text-ink-500">{t("transfer.placesHint")}</p>
              </div>
            </Step>

            <Step n={4} title={t("transfer.step.when")}>
              <div className="grid gap-3 sm:grid-cols-3">
                <DateField
                  label={t("search.date")}
                  locale={locale}
                  value={date}
                  onChange={setDate}
                  min={min?.date}
                  max={maxBookableDate()}
                />
                <SelectField
                  label={t("transfer.time")}
                  value={time}
                  onValueChange={setTime}
                  disabled={!slots.length}
                  options={slots.map((s) => ({ value: s, label: s }))}
                />
                <SelectField
                  label={t("search.passengers")}
                  value={String(passengers)}
                  onValueChange={(v) => setPassengers(Number(v))}
                  options={count(PASSENGER_MAX)}
                />
              </div>
              <p className="mt-2 text-xs text-ink-500">{t("transfer.minNotice")}</p>
              <TextAreaField
                className="mt-4"
                label={t("transfer.notes")}
                value={notes}
                maxLength={200}
                onChange={(e) => setNotes(e.target.value)}
                helper={t("transfer.notesHint")}
              />
            </Step>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-header lg:h-fit">
            <Step n={5} title={t("transfer.quoteTitle")}>
              <TransferMap
                city={city}
                pickup={pickup}
                dropoff={dropoff}
                route={complete ? quote.data?.route : undefined}
                picking={Boolean(picking)}
                onPick={onPick}
                className="h-64 sm:h-72"
              />

              {!complete ? (
                <p className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
                  {t(mode === "HOURLY" ? "transfer.needPickup" : "transfer.needPoints")}
                </p>
              ) : quote.isError ? (
                <p role="alert" className="mt-4 rounded-xl bg-bad-100 p-4 text-sm font-medium text-bad-600">
                  {t(quoteErrorKey)}
                </p>
              ) : !quote.data ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-ink-500">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("transfer.quoting")}
                </p>
              ) : (
                <div className={cn("mt-4 space-y-4", quote.isFetching && "opacity-60")}>
                  {mode === "DISTANCE" && (
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700">
                      <span className="flex items-center gap-1.5">
                        <Route className="size-4 text-brand-500" aria-hidden="true" />
                        <strong className="font-semibold">{fmtKm(quote.data.distanceKm, locale)}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-4 text-brand-500" aria-hidden="true" />
                        <strong className="font-semibold">
                          {formatMinutes(quote.data.durationMinutes, locale)}
                        </strong>
                      </span>
                      {quote.data.routeSource === "ESTIMATE" && (
                        <span className="w-full text-xs text-ink-500">{t("transfer.estimate")}</span>
                      )}
                    </p>
                  )}

                  {quotes.length === 0 ? (
                    <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700">{t("transfer.noCategories")}</p>
                  ) : (
                    <ul className="space-y-3">
                      {quotes.map((q) => {
                        const cat = categories.find((c) => c.id === q.categoryId);
                        const chosen = categoryId === q.categoryId;
                        return (
                          <li key={q.categoryId}>
                            <button
                              type="button"
                              disabled={!q.available}
                              aria-pressed={chosen}
                              onClick={() => setCategoryId(q.categoryId)}
                              className={cn(
                                // Wraps: on a phone the price drops under the name instead of squeezing it.
                                "flex w-full flex-wrap items-center gap-4 rounded-xl p-4 text-left ring-1 ring-inset transition-colors",
                                chosen ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white ring-ink-100 hover:bg-ink-50",
                                !q.available && "cursor-not-allowed opacity-60"
                              )}
                            >
                              <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50">
                                {cat?.image ? (
                                  <Image src={mediaUrl(cat.image)} alt="" fill sizes="64px" className="object-cover" />
                                ) : (
                                  <CarTaxiFront className="size-7 text-brand-500" aria-hidden="true" />
                                )}
                              </span>
                              <span className="min-w-0 grow basis-40">
                                <span className="block font-bold text-brand-900">{placeText(q.name, locale)}</span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
                                  <Users className="size-3.5" aria-hidden="true" />
                                  {t("transfer.seats", { n: q.seats })}
                                  {cat?.luggage ? ` · ${cat.luggage}` : ""}
                                </span>
                                {q.available ? (
                                  cat?.description ? (
                                    <span className="mt-0.5 line-clamp-2 block text-xs text-ink-500">
                                      {placeText(cat.description, locale)}
                                    </span>
                                  ) : null
                                ) : (
                                  <span className="mt-0.5 block text-xs font-semibold text-bad-600">
                                    {t("transfer.tooSmall", { n: passengers })}
                                  </span>
                                )}
                              </span>
                              <span className="ml-auto shrink-0 text-right">
                                <Price money={q.price} className="block text-lg font-bold text-brand-900" />
                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-700">
                                  {chosen && <Check className="size-3.5" aria-hidden="true" />}
                                  {chosen ? t("transfer.chosen") : t("transfer.choose")}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </Step>

            <Step n={6} title={t("listing.book")}>
              <button
                type="button"
                onClick={book}
                disabled={!categoryId || !complete || !quote.data || quote.isPlaceholderData}
                className="btn btn-lg btn-primary w-full"
              >
                {t("transfer.book")}
              </button>
              <p className="mt-2 text-xs text-ink-500">
                {categoryId ? t("listing.taxesNote") : t("transfer.pickCategory")}
              </p>
            </Step>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
