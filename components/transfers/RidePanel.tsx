import { Price } from "@/components/site/bits";
import { TextAreaField } from "@/components/ui/field";
import { dial, useSiteContact } from "@/lib/contact";
import { formatMinutes } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import {
  alertRide,
  canAlert,
  fmtAt,
  fmtKm,
  MAX_RIDE_COMMENT,
  placeText,
  rateRide,
  RIDE_TONE
} from "@/lib/transfers";
import { cn } from "@/lib/utils";
import type { Order, Ride } from "@/typescript/interface/domain.interface";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Loader2, Phone, Star } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AlertButton } from "./AlertButton";
import TransferMap from "./TransferMap";

/**
 * The ride behind a TRANSFER order, on the confirmation page and the booking
 * page: the map, where the ride stands in one plain sentence, the driver once
 * one is named, the alert button while it matters, and the rating afterwards.
 * Nothing when the order is not a transfer.
 */
export default function RidePanel({ order, className }: { order: Order; className?: string }) {
  const ride = order.items.find((i) => i.ride)?.ride;
  if (!ride) return null;
  return <RideBlock key={order.reference} order={order} ride={ride} className={className} />;
}

function RideBlock({
  order,
  ride,
  className
}: {
  order: Order;
  ride: Ride;
  className?: string;
}) {
  const { t, locale } = usePrefs();
  const contact = useSiteContact();
  const qc = useQueryClient();
  const reference = order.reference;
  // A rating sent from this page: the re-read order swaps the form for the
  // stars at once, so the thanks would never be seen without this.
  const [thanked, setThanked] = useState(false);
  // Cash on a ride is the driver's to collect at the end of it — never an
  // office counter with a deadline, which is what the order pages say otherwise.
  const cashOwed =
    order.paymentMethod === "CASH" && order.paymentStatus !== "PAID" && order.status !== "CANCELLED";

  // The office assigns, the driver starts and ends: while any of that can still
  // happen the order is re-read every minute, so the page follows the ride.
  // ponytail: polling; a push channel when one exists.
  const live = ride.status === "PENDING" || ride.status === "ASSIGNED" || ride.status === "STARTED";
  useEffect(() => {
    if (!live) return;
    const id = setInterval(
      () => qc.invalidateQueries({ queryKey: ["order", reference] }),
      60_000
    );
    return () => clearInterval(id);
  }, [live, qc, reference]);

  const driver = ride.driver;
  const vehicle = ride.vehicle;
  const vehicleLine = [
    [vehicle?.make, vehicle?.model].filter(Boolean).join(" "),
    vehicle?.color,
    vehicle?.plate
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className={cn("surface overflow-hidden", className)} aria-labelledby="ride-heading">
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ride-heading" className="text-lg font-bold text-brand-900">
            {t("ride.title")}
          </h2>
          <span className={cn("rounded px-2.5 py-1 text-xs font-bold", RIDE_TONE[ride.status])}>
            {t(`ride.status.${ride.status}`)}
          </span>
        </div>
        <p className="mt-2 text-[15px] text-ink-900">{t(`ride.sentence.${ride.status}`)}</p>
        {cashOwed && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-warn-100 px-4 py-3 text-sm text-ink-900">
            <Banknote className="mt-0.5 size-4 shrink-0 text-warn-600" aria-hidden="true" />
            <span>
              {t("ride.cashDriver")}
              <strong className="block font-bold">
                <Price money={order.total} charged={order.chargedCurrency} />
              </strong>
            </span>
          </p>
        )}
      </div>

      <TransferMap
        pickup={ride.pickup}
        dropoff={ride.dropoff}
        route={ride.route}
        estimated={ride.routeSource === "ESTIMATE"}
        className="h-56 rounded-none"
      />

      <dl className="grid gap-x-6 gap-y-3 p-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-500">{t("ride.pickupAt")}</dt>
          <dd className="font-semibold text-ink-900">{fmtAt(ride.at, locale)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t("transfer.pickup")}</dt>
          <dd className="font-semibold text-ink-900">{ride.pickup.label}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t("transfer.dropoff")}</dt>
          <dd className="font-semibold text-ink-900">
            {ride.dropoff?.label ?? t("ride.hourly", { n: ride.hours ?? 0 })}
          </dd>
        </div>
        <div>
          <dt className="text-ink-500">{t("results.category")}</dt>
          <dd className="font-semibold text-ink-900">
            {placeText(ride.category, locale)} ·{" "}
            {ride.passengers} {t(ride.passengers > 1 ? "common.people" : "common.person")}
          </dd>
        </div>
        {ride.mode === "DISTANCE" && (
          <div className="sm:col-span-2">
            <dt className="text-ink-500">{t("transfer.distance")}</dt>
            <dd className="font-semibold text-ink-900">
              {fmtKm(ride.distanceKm, locale)} · {formatMinutes(ride.durationMinutes, locale)}
              {ride.routeSource === "ESTIMATE" && (
                <span className="block text-xs font-normal text-ink-500">{t("transfer.estimate")}</span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {driver && (
        <div className="border-t border-ink-100/70 p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t("ride.driver")}
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-900 text-lg font-bold text-white">
              {driver.photo ? (
                <Image src={mediaUrl(driver.photo)} alt="" fill sizes="56px" className="object-cover" />
              ) : (
                driver.name.slice(0, 1)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink-900">{driver.name}</p>
              {driver.rating ? (
                <p className="flex items-center gap-1 text-sm text-ink-500">
                  <Star className="size-3.5 fill-accent-500 text-accent-500" aria-hidden="true" />
                  <span className="tnum">{driver.rating.toFixed(1)}</span>
                  {driver.count ? <span>({driver.count})</span> : null}
                </p>
              ) : null}
              {vehicleLine && <p className="text-sm text-ink-700">{vehicleLine}</p>}
            </div>
            {/* Tappable: the number is the point of showing the driver. */}
            {driver.phone && (
              <a href={`tel:${dial(driver.phone)}`} className="btn btn-md btn-dark">
                <Phone className="size-4" aria-hidden="true" />
                {t("ride.call")}
              </a>
            )}
          </div>
        </div>
      )}

      {canAlert(ride) && (
        <div className="border-t border-ink-100/70 p-6">
          <AlertButton
            onSend={(position) => alertRide(reference, position ?? {})}
            phone={contact.phone}
            confirmText={t("ride.alertConfirm")}
          />
        </div>
      )}

      {ride.canRate ? (
        <RateForm reference={reference} onSent={() => setThanked(true)} />
      ) : ride.rating ? (
        <div className="border-t border-ink-100/70 p-6">
          {thanked && (
            <p role="status" className="mb-3 flex items-center gap-2 text-sm font-medium text-ok-600">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {t("ride.rated")}
            </p>
          )}
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t("ride.yourRating")}
          </h3>
          <StarRow n={ride.rating.score} label={t("reviews.stars", { n: ride.rating.score })} />
          {ride.rating.comment && (
            <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{ride.rating.comment}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function StarRow({ n, label }: { n: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="mt-2 inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn("size-5", i <= n ? "fill-accent-500 text-accent-500" : "text-ink-200")}
        />
      ))}
    </span>
  );
}

/** Same native-radio star picker as the reviews: arrow keys move, Tab leaves. */
function RateForm({ reference, onSent }: { reference: string; onSent: () => void }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const starsLabel = (n: number) => t(n === 1 ? "reviews.star" : "reviews.stars", { n });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!score) return setError(t("reviews.pickRating"));
    setError("");
    setBusy(true);
    try {
      await rateRide(reference, { score, comment: comment.trim() || undefined });
      setSent(true);
      onSent();
      // The order now carries the rating (and `canRate` false): re-read it.
      qc.invalidateQueries({ queryKey: ["order", reference] });
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p role="status" className="flex items-center gap-2 border-t border-ink-100/70 p-6 text-sm font-medium text-ok-600">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        {t("ride.rated")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 border-t border-ink-100/70 p-6">
      <h3 className="font-bold text-brand-900">{t("ride.rate")}</h3>
      <fieldset>
        <legend className="sr-only">{t("reviews.yourRating")}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="ride-rating"
                value={n}
                checked={score === n}
                onChange={() => {
                  setScore(n);
                  setError("");
                }}
                className="peer sr-only"
              />
              <Star
                aria-hidden="true"
                className={cn(
                  "size-11 rounded-md p-1 transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-500",
                  n <= score ? "fill-accent-500 text-accent-500" : "text-ink-300 hover:text-accent-500"
                )}
              />
              <span className="sr-only">{starsLabel(n)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <TextAreaField
        label={t("ride.rateComment")}
        value={comment}
        maxLength={MAX_RIDE_COMMENT}
        onChange={(e) => setComment(e.target.value)}
        helper={`${comment.length} / ${MAX_RIDE_COMMENT}`}
      />
      {error && (
        <p role="alert" className="text-sm font-medium text-bad-600">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-md btn-primary">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {t("ride.rateSubmit")}
      </button>
    </form>
  );
}
