import DriverLayout from "@/components/driver/DriverLayout";
import { Price } from "@/components/site/bits";
import { useDriver, useDriverRides, type DriverRide, type RideScope } from "@/lib/driver";
import { fmtDate, fmtTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { RIDE_TONE } from "@/lib/transfers";
import { cn } from "@/lib/utils";
import { ChevronRight, WifiOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const TABS: RideScope[] = ["today", "upcoming", "done"];

/** The driver's rides: today's first, because that is what the phone is out for. */
export default function DriverRidesPage() {
  const { t, locale } = usePrefs();
  const { driver } = useDriver();
  const [scope, setScope] = useState<RideScope>("today");
  const { data, isPending, isError, refetch } = useDriverRides(scope, Boolean(driver));

  return (
    <DriverLayout title={t("driver.rides")}>
      <h1 className="display text-2xl text-brand-900">{t("driver.rides")}</h1>
      {driver && (
        <p className="mt-1 text-ink-500">
          {driver.name}
          {driver.vehicle?.plate ? ` · ${driver.vehicle.plate}` : ""}
        </p>
      )}

      <div role="tablist" className="mt-5 flex gap-1 border-b border-ink-100/70">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={scope === key}
            onClick={() => setScope(key)}
            className={cn(
              "-mb-px min-h-12 flex-1 border-b-2 px-2 text-sm font-semibold",
              scope === key
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-700"
            )}
          >
            {t(`driver.tabs.${key}`)}
          </button>
        ))}
      </div>

      {data?.cachedAt && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-warn-100 px-4 py-3 text-sm font-medium text-warn-600">
          <WifiOff className="size-4 shrink-0" aria-hidden="true" />
          {t("driver.offline", { at: fmtTime(data.cachedAt, locale) })}
        </p>
      )}

      <div className="mt-4">
        {isPending ? (
          <p className="surface p-10 text-center text-sm text-ink-500">{t("common.loading")}…</p>
        ) : isError ? (
          <div className="surface p-10 text-center">
            <p className="text-sm font-medium text-bad-600">{t("common.error")}</p>
            <button type="button" onClick={() => refetch()} className="btn btn-md btn-dark mt-4">
              {t("common.retry")}
            </button>
          </div>
        ) : !data?.items.length ? (
          <p className="surface p-10 text-center text-sm text-ink-500">
            {t(scope === "today" ? "driver.noRidesToday" : "driver.noRides")}
          </p>
        ) : (
          <ul className="space-y-3">
            {data.items.map((ride) => (
              <li key={ride.reference}>
                <RideCard ride={ride} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </DriverLayout>
  );
}

/** Time first and large: a driver reads the list by the clock. */
function RideCard({ ride }: { ride: DriverRide }) {
  const { t, locale } = usePrefs();
  const paid = Boolean(ride.payment?.paid);
  // Only a cash order still owed is the driver's to collect; an unpaid online
  // order is the office's business, and saying "paid" for it would be a lie.
  const collect = ride.payment?.method === "CASH" && !paid;
  return (
    <Link href={`/driver/rides/${encodeURIComponent(ride.reference)}`} className="surface card-lift block p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tnum text-2xl font-bold leading-none text-brand-900">{ride.at.slice(11, 16)}</p>
          <p className="mt-1 text-xs text-ink-500">{fmtDate(`${ride.at.slice(0, 10)}T12:00:00`, locale)}</p>
        </div>
        <span className={cn("rounded px-2.5 py-1 text-xs font-bold", RIDE_TONE[ride.status])}>
          {t(`ride.status.${ride.status}`)}
        </span>
      </div>
      <p className="mt-3 font-semibold text-ink-900">
        {ride.pickup.label} → {ride.dropoff?.label ?? t("ride.hourly", { n: ride.hours ?? 0 })}
      </p>
      <p className="mt-1 text-sm text-ink-700">
        {ride.customer?.name}
        {ride.customer?.name ? " · " : ""}
        {ride.passengers} {t(ride.passengers > 1 ? "common.people" : "common.person")}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        {paid ? (
          <span className="text-sm font-bold text-ok-600">{t("driver.paid")}</span>
        ) : collect && ride.price ? (
          <span className="text-sm font-bold text-warn-600">
            {t("driver.collect")} <Price money={ride.price} />
          </span>
        ) : (
          <span />
        )}
        <ChevronRight className="size-4 text-ink-300" aria-hidden="true" />
      </div>
    </Link>
  );
}
