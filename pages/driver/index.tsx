import DriverLayout from "@/components/driver/DriverLayout";
import { PasswordField } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/PhoneField";
import { ApiError } from "@/lib/api";
import { DEFAULT_COUNTRY, toE164 } from "@/lib/countries";
import { DRIVER_KEY, driverLogin, useDriver } from "@/lib/driver";
import { usePrefs } from "@/lib/prefs";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * Driver sign-in: phone + the password the office set. No sign-up and no SMS
 * code here — a driver is created by the office, which hands the password over
 * in person, so there is nothing for this screen to prove.
 */
export default function DriverLoginPage() {
  const { t } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { driver, isPending } = useDriver();

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [field, setField] = useState<"phone" | "password" | null>(null);
  const [busy, setBusy] = useState(false);
  const e164 = toE164(country, phone);

  /** Only a page of this portal: a `next` pointing anywhere else is ignored. */
  const destination = () => {
    const next = router.query.next;
    return typeof next === "string" && /^\/driver(\/|$)/.test(next) ? next : "/driver/rides";
  };

  useEffect(() => {
    if (!isPending && driver) router.replace(destination());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, driver]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!e164) {
      setError(t("err.phone"));
      setField("phone");
      return;
    }
    setError("");
    setField(null);
    setBusy(true);
    try {
      const me = await driverLogin({ phone: e164, password });
      qc.setQueryData(DRIVER_KEY, me);
      router.replace(destination());
    } catch (err) {
      // One message for every cause (§7.4): this screen never says whether a
      // number is a driver's.
      const denied = err instanceof ApiError && (err.code === "BAD_CREDENTIALS" || err.status === 401);
      setError(denied ? t("auth.badCredentials") : t("common.error"));
      setField(denied ? "password" : null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DriverLayout guest title={t("driver.loginTitle")}>
      <div className="mx-auto max-w-md pt-6">
        <h1 className="display text-2xl text-brand-900 sm:text-3xl">{t("driver.loginTitle")}</h1>
        <p className="mt-2 text-[15px] text-ink-500">{t("driver.loginBody")}</p>

        <form onSubmit={submit} noValidate className="mt-8 space-y-4">
          {error && !field && (
            <p role="alert" className="rounded-xl bg-bad-100 px-4 py-3 text-sm font-medium text-bad-600 ring-1 ring-bad-600/15 ring-inset">
              {error}
            </p>
          )}
          <PhoneField
            label={t("auth.phone")}
            country={country}
            national={phone}
            onCountryChange={setCountry}
            onNationalChange={(v) => {
              setPhone(v);
              setError("");
            }}
            error={field === "phone" ? error : undefined}
            autoFocus
          />
          <PasswordField
            label={t("auth.password")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            autoComplete="current-password"
            error={field === "password" ? error : undefined}
          />
          <button
            type="submit"
            disabled={busy || !e164 || !password}
            className="btn btn-lg btn-primary w-full"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t("auth.signInCta")}
          </button>
        </form>

        <p className="mt-6 flex items-start gap-2 rounded-xl bg-ink-50 p-5 text-sm text-ink-700 ring-1 ring-ink-100 ring-inset">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
          {t("driver.forgotNote")}
        </p>
      </div>
    </DriverLayout>
  );
}
