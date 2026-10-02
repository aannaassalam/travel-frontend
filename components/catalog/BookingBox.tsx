import { Price, SettlementNote, Scarcity } from "@/components/site/bits";
import { CheckoutSelection, useCheckout } from "@/lib/checkout";
import { DatePicker } from "@/components/ui/DatePicker";
import { InlineSelect } from "@/components/ui/InlineSelect";
import { mediaUrl } from "@/lib/media";
import { multiply, nightsBetween } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { Listing } from "@/typescript/interface/domain.interface";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useState } from "react";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) =>
  new Date(new Date(iso).getTime() + n * 86400000).toISOString().slice(0, 10);

/**
 * §11.2 sticky booking box.
 *
 * The hold is created on submit — that is the moment the customer "enters
 * checkout" per §4.5(3). Holding stock from the moment someone opens a page
 * would strand capital the client has already spent.
 */
export default function BookingBox({ listing }: { listing: Listing }) {
  const { t, locale, lz } = usePrefs();
  const router = useRouter();
  const { start } = useCheckout();

  const isCar = listing.vertical === "CAR";
  const [quantity, setQuantity] = useState(1);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(plusDays(today(), 3));

  // Moving pickup past the return would make `units` zero or negative. Keep
  // return at least a day after pickup.
  function setFromDate(v: string) {
    setFrom(v);
    if (to <= v) setTo(plusDays(v, 1));
  }

  const units = isCar ? nightsBetween(from, to) : 1;
  const soldOut = listing.available <= 0;
  // Scale every currency together rather than converting a USD total.
  const total = multiply(listing.sellPrice, quantity * units);

  const unitNoun: CheckoutSelection["unitNoun"] = isCar ? "day" : "person";
  const priceSuffix = isCar ? t("listing.perDay") : t("listing.perPerson");

  function book() {
    start({
      vertical: listing.vertical,
      listingSlug: listing.slug,
      listingId: listing.id,
      label: lz(listing.title),
      sublabel: listing.city,
      image: mediaUrl(listing.images[0]),
      unitPrice: listing.sellPrice,
      quantity,
      units,
      unitNoun,
      startDate: isCar ? from : listing.attributes.segments?.[0]?.departsAt ?? listing.attributes.departsAt ?? from,
      endDate: isCar ? to : undefined,
      adults: isCar ? undefined : quantity,
      available: listing.available
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

  return (
    <div className="surface p-6">
      {/* Wraps: the badge drops below the price rather than fighting it for a
          line neither can have. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-500">{t("listing.from")}</p>
          <Price money={listing.sellPrice} className="text-3xl font-bold text-brand-900" />
          <p className="text-sm text-ink-500">{priceSuffix}</p>
        </div>
        <Scarcity
          available={listing.available}
          noun={listing.vertical === "FLIGHT" ? "seat" : "unit"}
        />
      </div>

      <div className="mt-4 space-y-3">
        {isCar ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("search.pickupDate")}
              </span>
              <DatePicker
                value={from}
                onChange={setFromDate}
                locale={locale}
                min={today()}
                placeholder={t("search.date")}
                triggerClassName="rounded-md border border-ink-100 px-3 py-2.5 focus-within:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("search.returnDate")}
              </span>
              <DatePicker
                value={to}
                onChange={setTo}
                locale={locale}
                min={plusDays(from, 1)}
                placeholder={t("search.date")}
                triggerClassName="rounded-md border border-ink-100 px-3 py-2.5 focus-within:border-brand-500"
              />
            </label>
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
              options={Array.from({ length: Math.min(9, listing.available) }, (_, i) => ({
                value: String(i + 1),
                label: `${i + 1} ${t(i === 0 ? "common.person" : "common.people")}`
              }))}
              triggerClassName="w-full justify-between py-2.5 text-[15px]"
            />
          </div>
        )}
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-ink-100/70 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-500">
            <Price money={listing.sellPrice} /> × {quantity}
            {isCar ? ` × ${units} ${t(units > 1 ? "common.days" : "common.day")}` : ""}
          </dt>
          <dd className="font-medium">
            <Price money={total} />
          </dd>
        </div>
        <div className="flex justify-between text-base font-bold text-brand-900">
          <dt>{t("checkout.totalDue")}</dt>
          <dd>
            <Price money={total} />
          </dd>
        </div>
        <SettlementNote money={total} />
      </dl>

      <button
        type="button"
        onClick={book}
        className="btn btn-lg btn-primary mt-4 w-full"
      >
        {t("listing.book")}
      </button>

      {/* §2.2(3): first of three surfaces — listing page, price summary, payment. */}
      <p className="mt-3 flex gap-2 text-xs leading-relaxed text-ink-700">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
        <span>
          <strong className="font-semibold">{t("policy.title")}</strong> — {t("policy.body")}{" "}
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
