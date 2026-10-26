import { Price, SettlementNote, Scarcity } from "@/components/site/bits";
import { useCheckout } from "@/lib/checkout";
import { DatePicker } from "@/components/ui/DatePicker";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { mediaUrl } from "@/lib/media";
import { baseMinor, multiply } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import {
  addHours,
  durationLabel,
  fitRental,
  hoursBetween,
  hoursOn,
  MAX_RENTAL_HOURS,
  nextFullHour,
  rateLabel,
  ratesOf,
  rentalPrice
} from "@/lib/rental";
import {
  addDays,
  arrivalOf,
  bookableTimesOn,
  faresOf,
  isRoute,
  nextDayWithDepartures,
  passengerCount,
  passengerMax,
  routeTotal,
  todayIso
} from "@/lib/routes";
import { fmtDateLong } from "@/lib/format";
import { usePolicyNotice, usePolicyTitle } from "@/lib/siteContent";
import { cn } from "@/lib/utils";
import { Listing, Money, Passengers } from "@/typescript/interface/domain.interface";
import { Clock, Minus, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState } from "react";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * §11.2 sticky booking box.
 *
 * The hold is created on submit — that is the moment the customer "enters
 * checkout" per §4.5(3). Holding stock from the moment someone opens a page
 * would strand capital the client has already spent.
 */
export default function BookingBox({ listing }: { listing: Listing }) {
  return isRoute(listing) ? <RouteBookingBox listing={listing} /> : <StockBookingBox listing={listing} />;
}

/** A car or an activity: a quantity from a counted stock. */
function StockBookingBox({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const notice = usePolicyNotice();
  const policyTitle = usePolicyTitle();
  const router = useRouter();
  const { start } = useCheckout();

  const isCar = listing.vertical === "CAR";
  const [quantity, setQuantity] = useState(1);

  /*
   * A car: pick-up and return to the hour, "YYYY-MM-DDTHH:00" as written, and
   * the earliest pick-up `min` — the next full hour. Set after mount: the hour
   * is this device's, and a static page reading the clock on the server would
   * disagree with the first render here. Default: from the next hour, for 24 h.
   */
  const [span, setSpan] = useState<{ min: string; start: string; end: string } | null>(null);
  useEffect(() => {
    if (!isCar) return;
    const min = nextFullHour();
    setSpan({ min, ...fitRental(min, min, 24) });
  }, [isCar]);

  /** A new pick-up or a new length, fitted against the clock as it is now. */
  function respan(from: string, length: number) {
    const min = nextFullHour();
    setSpan({ min, ...fitRental(min, from, length) });
  }

  const rates = isCar ? ratesOf(listing) : [];
  const hours = span ? hoursBetween(span.start, span.end) : 0;
  const rental = rentalPrice(rates, hours);
  // The return: from an hour after pick-up — the same day, if there is one
  // left — to the server's 365 days.
  const firstReturn = span ? addHours(span.start, 1) : "";
  const lastReturn = span ? addHours(span.start, MAX_RENTAL_HOURS) : "";
  const hourOptions = (hh: string[]) => hh.map((h) => ({ value: h, label: h }));

  const available = listing.available ?? 9;
  const soldOut = available <= 0;
  // A car's price per car is its whole hire; the cheapest mix of its rates.
  const unitPrice = isCar ? rental.total : listing.sellPrice;
  // Scale every currency together rather than converting a franc total.
  const total = multiply(unitPrice, quantity);
  // A car is priced once its times are set, just after mount.
  const ready = !isCar || rental.blocks.length > 0;

  function book() {
    if (!ready) return;
    // Left open past the pick-up hour: move it on, keeping the length, so the
    // customer books what they can see.
    if (span && span.start < nextFullHour()) return respan(span.start, hours);
    start({
      vertical: listing.vertical,
      listingSlug: listing.slug,
      listingId: listing.id,
      label: lz(listing.title),
      sublabel: listing.city,
      image: mediaUrl(listing.images[0]),
      unitPrice,
      quantity,
      units: 1,
      unitNoun: isCar ? "unit" : "person",
      startDate: span?.start ?? listing.attributes.departsAt ?? today(),
      endDate: span?.end,
      rentalHours: span ? hours : undefined,
      rentalBlocks: span ? rental.blocks : undefined,
      adults: isCar ? undefined : quantity,
      available
    });
    router.push("/booking/travellers");
  }

  if (soldOut) {
    return (
      <div className="surface p-6">
        <p className="mb-1 text-sm text-ink-500">{t("listing.from")}</p>
        <Price money={listing.sellPrice} className="text-3xl font-bold text-ink-300 line-through" />
        <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-700">
          {t("listing.soldOut")}
        </p>
        <p className="mt-3 text-sm text-ink-700">{t("empty.body")}</p>
        <a
          href="#request"
          className="btn btn-lg btn-primary mt-4 w-full"
        >
          {t("empty.cta")}
        </a>
      </div>
    );
  }

  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500";
  const dateField = "rounded-md border border-ink-100 px-3 py-2.5 focus-within:border-brand-500";
  const timeField = "w-full justify-between rounded-md py-2.5 text-[15px]";

  return (
    <div className="surface p-6">
      {isCar ? (
        // A car's price is made of these, so they are the header.
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-500">{t("rental.rates")}</p>
            <Scarcity available={listing.available} noun="unit" />
          </div>
          <dl className="mt-1.5 space-y-1">
            {rates.map((r) => (
              <div key={r.hours} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-ink-700">{rateLabel(r.hours, t)}</dt>
                <dd>
                  <Price money={r.price} className="text-lg font-bold text-brand-900" />
                </dd>
              </div>
            ))}
          </dl>
          {rates.length > 1 && <p className="mt-2 text-xs text-ink-500">{t("rental.cheapest")}</p>}
        </>
      ) : (
        // Wraps: the badge drops below the price rather than fighting it for a
        // line neither can have.
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink-500">{t("listing.from")}</p>
            <Price money={listing.sellPrice} className="text-3xl font-bold text-brand-900" />
            <p className="text-sm text-ink-500">{t("listing.perPerson")}</p>
          </div>
          <Scarcity
            available={listing.available}
            noun={listing.vertical === "FLIGHT" ? "seat" : "unit"}
          />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {isCar ? (
          // Same-day hire is fine: the length is counted in hours. The time
          // lists only offer what can follow — no hour already begun today, no
          // return before the pick-up — and every change is re-fitted.
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <label className="block">
              <span className={label}>{t("search.pickupDate")}</span>
              <DatePicker
                value={span?.start.slice(0, 10) ?? ""}
                onChange={(d) => span && d && respan(`${d}${span.start.slice(10)}`, hours)}
                locale={locale}
                min={span?.min.slice(0, 10)}
                max={span ? addDays(span.min.slice(0, 10), 365) : undefined}
                placeholder={t("search.date")}
                triggerClassName={dateField}
              />
            </label>
            <div>
              <span className={label}>{t("rental.time")}</span>
              <InlineSelect
                ariaLabel={t("rental.pickupTime")}
                value={span?.start.slice(11) ?? ""}
                onValueChange={(h) => span && respan(`${span.start.slice(0, 11)}${h}`, hours)}
                options={span ? hourOptions(hoursOn(span.start.slice(0, 10), span.min)) : []}
                triggerClassName={timeField}
              />
            </div>
            <label className="block">
              <span className={label}>{t("search.returnDate")}</span>
              <DatePicker
                value={span?.end.slice(0, 10) ?? ""}
                onChange={(d) =>
                  span && d && respan(span.start, hoursBetween(span.start, `${d}${span.end.slice(10)}`))
                }
                locale={locale}
                min={firstReturn.slice(0, 10) || undefined}
                max={lastReturn.slice(0, 10) || undefined}
                placeholder={t("search.date")}
                triggerClassName={dateField}
              />
            </label>
            <div>
              <span className={label}>{t("rental.time")}</span>
              <InlineSelect
                ariaLabel={t("rental.returnTime")}
                value={span?.end.slice(11) ?? ""}
                onValueChange={(h) =>
                  span && respan(span.start, hoursBetween(span.start, `${span.end.slice(0, 11)}${h}`))
                }
                options={span ? hourOptions(hoursOn(span.end.slice(0, 10), firstReturn, lastReturn)) : []}
                triggerClassName={timeField}
              />
            </div>
          </div>
        ) : (
          <div className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
              {listing.vertical === "ACTIVITY" ? t("search.guests") : t("search.passengers")}
            </span>
            <InlineSelect
              ariaLabel={
                listing.vertical === "ACTIVITY" ? t("search.guests") : t("search.passengers")
              }
              value={String(quantity)}
              onValueChange={(v) => setQuantity(Number(v))}
              options={Array.from({ length: Math.min(9, available) }, (_, i) => ({
                value: String(i + 1),
                label: `${i + 1} ${t(i === 0 ? "common.person" : "common.people")}`
              }))}
              triggerClassName="w-full justify-between py-2.5 text-[15px]"
            />
          </div>
        )}
      </div>

      {ready && (
        <dl className="mt-4 space-y-1.5 border-t border-ink-100/70 pt-4 text-sm">
          {isCar ? (
            <>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t("listing.duration")}</dt>
                <dd className="font-medium">{durationLabel(hours, t)}</dd>
              </div>
              {/* What that length costs: "1 × 24 h", "1 × 6 h". */}
              {rental.blocks.map((b) => (
                <div key={b.hours} className="flex justify-between">
                  <dt className="text-ink-500">
                    {b.count} × {b.hours} h
                  </dt>
                  <dd className="font-medium">
                    <Price money={b.price} />
                  </dd>
                </div>
              ))}
            </>
          ) : (
            <div className="flex justify-between">
              <dt className="text-ink-500">
                <Price money={listing.sellPrice} /> × {quantity}
              </dt>
              <dd className="font-medium">
                <Price money={total} />
              </dd>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-brand-900">
            <dt>{t("checkout.totalDue")}</dt>
            <dd>
              <Price money={total} />
            </dd>
          </div>
          <SettlementNote money={total} />
        </dl>
      )}

      <button
        type="button"
        onClick={book}
        disabled={!ready}
        className="btn btn-lg btn-primary mt-4 w-full"
      >
        {t("listing.book")}
      </button>

      {/* §2.2(3): first of three surfaces — listing page, price summary, payment. */}
      <p className="mt-3 flex gap-2 text-xs leading-relaxed text-ink-700">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
        <span>
          <strong className="font-semibold">{policyTitle}</strong> — {notice}{" "}
          <Link href="/terms#no-refund" className="text-brand-500 underline">
            {t("policy.readFull")}
          </Link>
        </span>
      </p>

      <p className="mt-3 text-xs text-ink-500">
        {locale === "fr"
          ? "Paiement en espèces à notre agence. Aucun frais caché."
          : "Pay in cash at our office. No hidden fees."}
      </p>
    </div>
  );
}

const DAY_RX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A bus or flight: the date, one of that day's departures, the passengers by
 * fare (adult 12+, child 2–12, baby under 2 — each pays its own price) and,
 * for a flight, the baggage the airline is told about. The server checks all
 * of it again against the same timetable.
 */
function RouteBookingBox({ listing }: { listing: Listing }) {
  const { t, locale } = usePrefs();
  const notice = usePolicyNotice();
  const policyTitle = usePolicyTitle();
  const router = useRouter();
  const { start } = useCheckout();
  const a = listing.attributes;
  const isFlight = listing.vertical === "FLIGHT";
  const fares = faresOf(listing);

  // The day starts on the client: a static page cannot know today, and the
  // searched day arrives in the address only once the router is ready.
  const [day, setDay] = useState("");
  useEffect(() => {
    if (!router.isReady) return;
    const asked = typeof router.query.date === "string" ? router.query.date : "";
    const from = DAY_RX.test(asked) && asked >= todayIso() ? asked : todayIso();
    setDay((current) => current || (nextDayWithDepartures(a, from) ?? from));
  }, [router.isReady, router.query.date, a]);

  const [time, setTime] = useState("");
  const [p, setP] = useState<Passengers>({ adults: 1, children: 0, infants: 0 });
  const [bags, setBags] = useState({ cabinKg: "", checkedKg: "" });
  const [tried, setTried] = useState(false);

  const times = day ? bookableTimesOn(a, day) : [];
  const chosen = times.includes(time) ? time : "";
  const next = day && !times.length ? nextDayWithDepartures(a, addDays(day, 1)) : undefined;
  const kg = (v: string) => v !== "" && Number(v) >= 0 && Number(v) <= 200;
  const bagsOk = !isFlight || (kg(bags.cabinKg) && kg(bags.checkedKg));
  const total = routeTotal(fares, p);

  function book() {
    setTried(true);
    if (!day || !chosen || !bagsOk) return;
    start({
      vertical: listing.vertical,
      listingSlug: listing.slug,
      listingId: listing.id,
      label: `${listing.city} → ${a.destination ?? ""}`,
      sublabel: a.operator,
      image: mediaUrl(listing.images[0]),
      unitPrice: listing.sellPrice,
      quantity: passengerCount(p),
      units: 1,
      unitNoun: "person",
      startDate: `${day}T${chosen}`,
      passengers: p,
      fares,
      baggage: isFlight
        ? { cabinKg: Number(bags.cabinKg), checkedKg: Number(bags.checkedKg) }
        : undefined
    });
    router.push("/booking/travellers");
  }

  const fareText = (m: Money) => (baseMinor(m) > 0 ? <Price money={m} /> : t("route.free"));
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500";

  return (
    <div className="surface p-6">
      <p className="text-sm text-ink-500">{t("listing.from")}</p>
      <Price money={listing.sellPrice} className="text-3xl font-bold text-brand-900" />
      <p className="text-sm text-ink-500">
        {t("listing.perPerson")} · {t("route.adult").toLowerCase()}
      </p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className={label}>{t("route.date")}</span>
          <DatePicker
            value={day}
            onChange={(v) => {
              setDay(v);
              setTime("");
            }}
            locale={locale}
            min={todayIso()}
            placeholder={t("search.date")}
            triggerClassName="rounded-md border border-ink-100 px-3 py-2.5 focus-within:border-brand-500"
          />
        </label>

        <div>
          <span className={label}>{t("route.time")}</span>
          {!day ? null : times.length ? (
            <div role="radiogroup" aria-label={t("route.time")} className="flex flex-wrap gap-2">
              {times.map((x) => (
                <button
                  key={x}
                  type="button"
                  role="radio"
                  aria-checked={chosen === x}
                  onClick={() => setTime(x)}
                  className={cn(
                    "rounded-md px-3 py-2 font-mono text-[15px] font-bold ring-1 ring-inset transition-colors",
                    chosen === x
                      ? "bg-brand-900 text-white ring-brand-900"
                      : "bg-white text-brand-900 ring-ink-100 hover:ring-brand-500"
                  )}
                >
                  {x}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-700">
              {t("route.noDeparture")}{" "}
              {next ? (
                <button
                  type="button"
                  className="font-semibold text-brand-500 underline"
                  onClick={() => {
                    setDay(next);
                    setTime("");
                  }}
                >
                  {t("route.nextOn", { date: fmtDateLong(`${next}T12:00:00`, locale) })}
                </button>
              ) : null}
            </p>
          )}
          {chosen && arrivalOf(chosen, a.durationMinutes) ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
              <Clock className="size-3.5" />
              {t("route.arrives", { time: arrivalOf(chosen, a.durationMinutes)! })}
            </p>
          ) : null}
          {tried && !chosen ? (
            <p role="alert" className="mt-2 text-sm font-semibold text-bad-600">
              {t("route.pickTime")}
            </p>
          ) : null}
        </div>

        <div>
          <span className={label}>{t("search.passengers")}</span>
          <div className="divide-y divide-ink-100/70 rounded-md ring-1 ring-ink-100 ring-inset">
            <Counter
              label={t("route.adults")}
              hint={t("route.adultsHint")}
              price={fareText(fares.adult)}
              value={p.adults}
              min={1}
              max={passengerMax(p, "adults")}
              onChange={(adults) => setP((x) => ({ ...x, adults, infants: Math.min(x.infants, adults) }))}
            />
            <Counter
              label={t("route.children")}
              hint={t("route.childrenHint")}
              price={fareText(fares.child)}
              value={p.children}
              min={0}
              max={passengerMax(p, "children")}
              onChange={(children) => setP((x) => ({ ...x, children }))}
            />
            <Counter
              label={t("route.infants")}
              hint={t("route.infantsHint")}
              price={fareText(fares.infant)}
              value={p.infants}
              min={0}
              max={passengerMax(p, "infants")}
              onChange={(infants) => setP((x) => ({ ...x, infants }))}
            />
          </div>
          {p.infants >= p.adults ? (
            <p className="mt-1.5 text-xs text-ink-500">{t("route.infantsLimit")}</p>
          ) : null}
        </div>

        {isFlight ? (
          <div>
            <span className={label}>{t("route.baggage")}</span>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["cabinKg", t("route.cabinKg")],
                  ["checkedKg", t("route.checkedKg")]
                ] as const
              ).map(([key, text]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs text-ink-700">{text}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={200}
                    step="0.5"
                    value={bags[key]}
                    onChange={(e) => setBags((b) => ({ ...b, [key]: e.target.value }))}
                    aria-invalid={tried && !kg(bags[key])}
                    className="w-full rounded-md border border-ink-100 px-3 py-2.5 text-[15px] focus:border-brand-500 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <p className={cn("mt-1.5 text-xs", tried && !bagsOk ? "font-semibold text-bad-600" : "text-ink-500")}>
              {tried && !bagsOk ? t("route.baggageRequired") : t("route.baggageHint")}
            </p>
          </div>
        ) : null}
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-ink-100/70 pt-4 text-sm">
        {(
          [
            [p.adults, t("route.adults"), fares.adult],
            [p.children, t("route.children"), fares.child],
            [p.infants, t("route.infants"), fares.infant]
          ] as const
        )
          .filter(([n]) => n > 0)
          .map(([n, who, fare]) => (
            <div key={who} className="flex justify-between">
              <dt className="text-ink-500">
                {n} × {who} · {fareText(fare)}
              </dt>
              <dd className="font-medium">
                <Price money={multiply(fare, n)} />
              </dd>
            </div>
          ))}
        <div className="flex justify-between text-base font-bold text-brand-900">
          <dt>{t("checkout.totalDue")}</dt>
          <dd>
            <Price money={total} />
          </dd>
        </div>
        <SettlementNote money={total} />
      </dl>

      <button type="button" onClick={book} className="btn btn-lg btn-primary mt-4 w-full">
        {t("listing.book")}
      </button>

      <p className="mt-3 flex gap-2 text-xs leading-relaxed text-ink-700">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
        <span>
          <strong className="font-semibold">{policyTitle}</strong> — {notice}{" "}
          <Link href="/terms#no-refund" className="text-brand-500 underline">
            {t("policy.readFull")}
          </Link>
        </span>
      </p>
    </div>
  );
}

/** One fare's passengers: a label, its price, and − / +. */
function Counter({
  label,
  hint,
  price,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  hint: string;
  price: React.ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const step = "flex size-9 items-center justify-center rounded-full bg-ink-50 text-brand-900 disabled:text-ink-300";
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink-900">{label}</p>
        <p className="text-xs text-ink-500">
          {hint} · {price}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className={step}
          aria-label={`${label} −`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-5 text-center text-base font-bold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className={step}
          aria-label={`${label} +`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
