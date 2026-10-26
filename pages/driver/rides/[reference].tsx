import DriverLayout from "@/components/driver/DriverLayout";
import { Price } from "@/components/site/bits";
import { AlertButton } from "@/components/transfers/AlertButton";
import TransferMap from "@/components/transfers/TransferMap";
import { dial, useSiteContact } from "@/lib/contact";
import {
  alertDriverRide,
  endDriverRide,
  startDriverRide,
  useDriver,
  useDriverRide
} from "@/lib/driver";
import { fmtDateTime, formatMinutes } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { canAlert, directionsLink, fmtAt, fmtKm, placeText, RIDE_TONE } from "@/lib/transfers";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Flag, Loader2, Navigation, Phone, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

/**
 * One ride, as the driver works it: the map, the facts, and big buttons —
 * start, end, call, directions — with the alert fixed at the bottom of the
 * screen so it is never a scroll away.
 */
export default function DriverRidePage() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const contact = useSiteContact();
  const { driver } = useDriver();
  const reference = router.isReady ? String(router.query.reference ?? "") : undefined;
  const { data: ride, isPending, isError, refetch } = useDriverRide(driver ? reference : undefined);
  const [busy, setBusy] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState("");

  async function act(kind: "start" | "end") {
    if (!reference) return;
    if (kind === "end" && !window.confirm(t("driver.endConfirm"))) return;
    setBusy(kind);
    setError("");
    try {
      await (kind === "start" ? startDriverRide : endDriverRide)(reference);
      await qc.invalidateQueries({ queryKey: ["driver-ride", reference] });
      // The list tabs move with it (today → done).
      qc.invalidateQueries({ queryKey: ["driver-rides"], refetchType: "all" });
    } catch {
      setError(t("driver.actionFailed"));
    } finally {
      setBusy(null);
    }
  }

  const paid = Boolean(ride?.payment?.paid);
  // Only a cash order still owed is the driver's to collect (see the list).
  const collect = ride?.payment?.method === "CASH" && !paid;
  const customer = ride?.customer;

  return (
    <DriverLayout title={ride?.reference ?? t("driver.rides")}>
      <Link
        href="/driver/rides"
        className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("driver.rides")}
      </Link>

      {isPending || !reference ? (
        <p className="surface mt-3 p-10 text-center text-sm text-ink-500">{t("common.loading")}…</p>
      ) : isError || !ride ? (
        <div className="surface mt-3 p-10 text-center">
          <p className="font-semibold text-brand-900">{t("common.notFound")}</p>
          <button type="button" onClick={() => refetch()} className="btn btn-md btn-dark mt-4">
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <div className="surface overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div>
                <p className="tnum text-3xl font-bold leading-none text-brand-900">{ride.at.slice(11, 16)}</p>
                <p className="mt-1 text-sm text-ink-500">{fmtAt(ride.at, locale)}</p>
                <p className="mt-1 font-mono text-xs text-ink-500">{ride.reference}</p>
              </div>
              <span className={cn("rounded px-2.5 py-1 text-xs font-bold", RIDE_TONE[ride.status])}>
                {t(`ride.status.${ride.status}`)}
              </span>
            </div>

            <TransferMap pickup={ride.pickup} dropoff={ride.dropoff} route={ride.route} className="h-56 rounded-none" />

            <dl className="space-y-3 p-5 text-sm">
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
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <div>
                  <dt className="text-ink-500">{t("search.passengers")}</dt>
                  <dd className="font-semibold text-ink-900">{ride.passengers}</dd>
                </div>
                {ride.category && (
                  <div>
                    <dt className="text-ink-500">{t("results.category")}</dt>
                    <dd className="font-semibold text-ink-900">{placeText(ride.category, locale)}</dd>
                  </div>
                )}
                {ride.mode === "DISTANCE" && ride.distanceKm != null && (
                  <div>
                    <dt className="text-ink-500">{t("transfer.distance")}</dt>
                    <dd className="font-semibold text-ink-900">
                      {fmtKm(ride.distanceKm, locale)}
                      {ride.durationMinutes ? ` · ${formatMinutes(ride.durationMinutes, locale)}` : ""}
                    </dd>
                  </div>
                )}
              </div>
              {ride.notes && (
                <div>
                  <dt className="text-ink-500">{t("driver.notes")}</dt>
                  <dd className="whitespace-pre-line font-semibold text-ink-900">{ride.notes}</dd>
                </div>
              )}
              <div className="border-t border-ink-100/70 pt-3">
                <dt className="text-ink-500">{t("driver.customer")}</dt>
                <dd className="font-semibold text-ink-900">
                  {customer?.name}
                  {customer?.phone && (
                    <a href={`tel:${dial(customer.phone)}`} className="ml-2 font-normal text-brand-700 underline">
                      {customer.phone}
                    </a>
                  )}
                </dd>
              </div>
              {(paid || (collect && ride.price)) && (
                <div>
                  <dt className="text-ink-500">{t("account.payment")}</dt>
                  <dd className={cn("font-bold", paid ? "text-ok-600" : "text-warn-600")}>
                    {paid ? (
                      t("driver.paid")
                    ) : (
                      <>
                        {t("driver.collect")} <Price money={ride.price} />
                      </>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="grid gap-3">
            {ride.status === "ASSIGNED" && (
              <button
                type="button"
                onClick={() => void act("start")}
                disabled={busy !== null}
                className="btn btn-lg btn-primary w-full"
              >
                {busy === "start" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
                {t("driver.start")}
              </button>
            )}
            {ride.status === "STARTED" && (
              <button
                type="button"
                onClick={() => void act("end")}
                disabled={busy !== null}
                className="btn btn-lg btn-dark w-full"
              >
                {busy === "end" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Flag className="size-5" aria-hidden="true" />}
                {t("driver.end")}
              </button>
            )}
            {ride.status === "COMPLETED" && (
              <p className="flex items-center gap-2 rounded-xl bg-ok-100 px-4 py-3 text-sm font-semibold text-ok-600">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                {t("ride.status.COMPLETED")}
                {ride.endedAt ? ` · ${fmtDateTime(ride.endedAt, locale)}` : ""}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm font-semibold text-bad-600">
                {error}
              </p>
            )}
            {customer?.phone && (
              <a href={`tel:${dial(customer.phone)}`} className="btn btn-lg btn-outline w-full">
                <Phone className="size-5" aria-hidden="true" />
                {t("driver.callCustomer")}
              </a>
            )}
            <a
              href={directionsLink(ride.pickup, ride.dropoff)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-lg btn-outline w-full"
            >
              <Navigation className="size-5" aria-hidden="true" />
              {t("ride.directions")}
            </a>
          </div>

          {ride.timeline?.length ? (
            <div className="surface p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("steps.history")}
              </h2>
              <ol className="relative space-y-3 border-l-2 border-ink-100 pl-5">
                {ride.timeline.map((e, i) => (
                  <li key={i}>
                    <p className="text-sm font-semibold text-ink-900">
                      {t(`ride.ev.${e.event}`) === `ride.ev.${e.event}`
                        ? e.event.replace(/_/g, " ").toLowerCase()
                        : t(`ride.ev.${e.event}`)}
                    </p>
                    <p className="text-xs text-ink-500">{fmtDateTime(e.at, locale)}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* Fixed, so the one button that matters in trouble needs no scrolling. */}
          {canAlert(ride) && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 p-3 backdrop-blur">
              <div className="container-site max-w-2xl">
                <AlertButton
                  onSend={(position) => alertDriverRide(ride.reference, position ?? {})}
                  phone={contact.phone}
                  confirmText={t("driver.alertConfirm")}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </DriverLayout>
  );
}
