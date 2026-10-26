import DriverLayout from "@/components/driver/DriverLayout";
import { PasswordField } from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { changeDriverPassword, DRIVER_KEY, driverLogout, useDriver } from "@/lib/driver";
import { usePrefs } from "@/lib/prefs";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, LogOut, Star } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";

const MIN_PASSWORD = 8;

/** Who the driver is, the vehicle the office linked, the rating, a new password, and out. */
export default function DriverAccountPage() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { driver } = useDriver();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const vehicle = driver?.vehicle;
  const vehicleLine = [
    [vehicle?.make, vehicle?.model].filter(Boolean).join(" "),
    vehicle?.color,
    vehicle?.plate
  ]
    .filter(Boolean)
    .join(" · ");

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < MIN_PASSWORD) return setMessage({ ok: false, text: t("err.password") });
    setBusy(true);
    setMessage(null);
    try {
      await changeDriverPassword({ current, next });
      setMessage({ ok: true, text: t("driver.passwordChanged") });
      setCurrent("");
      setNext("");
    } catch (err) {
      const denied =
        err instanceof ApiError && (err.code === "BAD_CREDENTIALS" || err.status === 401 || err.status === 403);
      setMessage({ ok: false, text: denied ? t("auth.badCredentials") : t("common.error") });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await driverLogout();
    } finally {
      // Whatever the server said, this browser is signed out: nothing of the
      // rides list may linger for whoever picks the phone up next.
      qc.setQueryData(DRIVER_KEY, null);
      qc.removeQueries({ queryKey: ["driver-rides"] });
      qc.removeQueries({ queryKey: ["driver-ride"] });
      router.replace("/driver");
    }
  }

  return (
    <DriverLayout title={t("driver.account")}>
      <h1 className="display text-2xl text-brand-900">{t("driver.account")}</h1>

      {driver && (
        <div className="surface mt-5 p-5">
          <p className="text-lg font-bold text-ink-900">{driver.name}</p>
          {driver.phone && <p className="tnum text-sm text-ink-700">{driver.phone}</p>}
          {driver.city && <p className="text-sm text-ink-500">{driver.city}</p>}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-500">{t("ride.vehicle")}</dt>
              <dd className="font-semibold text-ink-900">{vehicleLine || t("driver.noVehicle")}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{t("driver.rating")}</dt>
              <dd className="flex items-center gap-1 font-semibold text-ink-900">
                {driver.ratingStats?.rating ? (
                  <>
                    <Star className="size-4 fill-accent-500 text-accent-500" aria-hidden="true" />
                    <span className="tnum">{driver.ratingStats.rating.toFixed(1)}</span>
                    {driver.ratingStats.count ? (
                      <span className="font-normal text-ink-500">({driver.ratingStats.count})</span>
                    ) : null}
                  </>
                ) : (
                  t("listing.noReviews")
                )}
              </dd>
            </div>
            {driver.counts?.today != null && (
              <div>
                <dt className="text-ink-500">{t("driver.tabs.today")}</dt>
                <dd className="font-semibold text-ink-900">
                  {/* "1 course", and "0 course" in French: the language's own rule. */}
                  {t(
                    new Intl.PluralRules(locale).select(driver.counts.today) === "one"
                      ? "driver.todayCountOne"
                      : "driver.todayCount",
                    { n: driver.counts.today }
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <form onSubmit={changePassword} noValidate className="surface mt-4 space-y-4 p-5">
        <h2 className="font-bold text-brand-900">{t("driver.changePassword")}</h2>
        <PasswordField
          label={t("driver.currentPassword")}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
        <PasswordField
          label={t("auth.newPassword")}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          helper={t("auth.passwordHint")}
        />
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`flex items-center gap-2 text-sm font-medium ${message.ok ? "text-ok-600" : "text-bad-600"}`}
          >
            {message.ok && <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !current || !next}
          className="btn btn-lg btn-dark w-full"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {t("common.save")}
        </button>
      </form>

      <button type="button" onClick={() => void signOut()} className="btn btn-lg btn-outline mt-4 w-full">
        <LogOut className="size-5" aria-hidden="true" />
        {t("nav.signout")}
      </button>
    </DriverLayout>
  );
}
