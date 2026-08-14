import Layout from "@/components/site/Layout";
import { TextField } from "@/components/ui/field";
import {
  DEMO_ACCOUNTS,
  DEMO_OTP,
  showDemoHint
} from "@/lib/demoAuth";
import { maskPhone, normalisePhone } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { ApiError } from "@/lib/api";
import { useRequestOtp, useVerifyOtp } from "@/lib/session";
import { FlaskConical, KeyRound, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

/**
 * §7.1/§7.2 — phone-first sign-in. Card and e-mail penetration are low relative
 * to mobile, so SMS OTP is the credential customers actually have.
 *
 * §7.4 anti-enumeration: this screen never reveals whether a number is already
 * registered. "We sent a code" is shown either way, because a differing message
 * hands the client's entire customer list to anyone iterating +243 numbers.
 * That is the most likely real-world data leak in a phone-first system.
 */
export default function SignInPage() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  /**
   * Asked for ONLY after the server says this phone has no account yet.
   *
   * The client cannot know in advance whether a number is registered — and it
   * must not be told, because that would answer "is this person a customer of
   * yours" to anyone who types a number (§7.4). So sign-in asks for a code and
   * nothing else; if the verified number turns out to be new, the server
   * replies NAME_REQUIRED and the same code is submitted again with a name.
   * A returning customer is never asked to retype their name.
   */
  const [needsName, setNeedsName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const sendCode = useRequestOtp();
  const signIn = useVerifyOtp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const e164 = normalisePhone(phone);

  /**
   * Real endpoint. The server answers identically whether or not the number is
   * known (§7.4) and rate-limits to 10/hour — an SMS costs money and points at
   * a handset the caller chose, so an unthrottled version of this is both a
   * security hole and a way to bill us for harassing a stranger.
   */
  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!e164) return setError(t("err.phone"));
    setError("");
    setBusy(true);
    try {
      await sendCode.mutateAsync(e164);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.required"));
    } finally {
      setBusy(false);
    }
  }

  /**
   * The code is checked server-side, and the session comes back as an httpOnly
   * cookie — §7.3: never localStorage for tokens. A wrong code fails the same
   * way whether or not the number is known, so nothing here branches on the
   * account existing.
   */
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(code)) return setError(t("err.otp"));
    setError("");
    setBusy(true);
    try {
      await signIn.mutateAsync({
        phone: e164!,
        code,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined
      });
      router.push(String(router.query.next || "/account"));
    } catch (err) {
      // A new number: reveal the name fields and let them resubmit. The code is
      // still valid — the server only spends it once the sign-in can complete.
      if (err instanceof ApiError && err.code === "NAME_REQUIRED") {
        setNeedsName(true);
        setError("");
        return;
      }
      setError(err instanceof Error ? err.message : t("auth.otpInvalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title={t("auth.title")} description={t("auth.subtitle")} noindex>
      <div className="grid lg:grid-cols-2">
        <div className="flex items-center justify-center px-4 py-14">
          <div className="w-full max-w-md">
            <h1 className="display text-2xl text-brand-900 sm:text-3xl">
              {t("auth.title")}
            </h1>
            <p className="mt-2 text-[15px] text-ink-500">{t("auth.subtitle")}</p>

            {step === "phone" ? (
              <form onSubmit={requestCode} noValidate className="mt-8 space-y-4">
                <TextField
                  label={t("auth.phone")}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError("");
                  }}
                  error={error}
                  helper={error ? undefined : "+243 81 000 00 00"}
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                />

                {mode === "password" && (
                  <TextField
                    label={t("auth.password")}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                )}

                <button
                  type={mode === "password" ? "button" : "submit"}
                  onClick={mode === "password" ? verify : undefined}
                  disabled={busy}
                  className="btn btn-lg btn-primary w-full"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {mode === "otp" ? t("auth.sendOtp") : t("nav.signin")}
                </button>

                <button
                  type="button"
                  onClick={() => setMode(mode === "otp" ? "password" : "otp")}
                  className="w-full text-sm font-semibold text-brand-500 hover:underline"
                >
                  {mode === "otp" ? t("auth.usePassword") : t("auth.useOtp")}
                </button>
              </form>
            ) : (
              <form onSubmit={verify} noValidate className="mt-8 space-y-4">
                <p className="rounded-md bg-brand-50 px-4 py-3 text-sm text-ink-700">
                  {t("auth.otpBody", { phone: maskPhone(e164 ?? phone) })}
                </p>
                <label className="block">
                  <span className="eyebrow mb-2 block text-brand-600">
                    {t("auth.otpTitle")}
                  </span>
                  {/* Six wide, tracked digits: the code is the only thing on
                      this screen, so it gets the whole field. */}
                  <input
                    className="w-full rounded-xl bg-white py-4 text-center font-mono text-3xl tracking-[0.4em] font-bold text-ink-900 shadow-xs ring-1 ring-ink-100 outline-none ring-inset focus:ring-2 focus:ring-brand-500 aria-invalid:ring-2 aria-invalid:ring-bad-600"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setError("");
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    aria-invalid={Boolean(error)}
                    autoFocus
                  />
                  {error && (
                    <p role="alert" className="mt-2 text-sm font-medium text-bad-600">
                      {error}
                    </p>
                  )}
                </label>
                {needsName && (
                <>
                <p className="rounded-md bg-accent-100 px-4 py-3 text-sm text-ink-900">
                  {locale === "fr"
                    ? "Bienvenue ! Ce numéro est nouveau — indiquez votre nom pour créer votre compte."
                    : "Welcome! This number is new — add your name to create your account."}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label={t("checkout.firstName")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                  <TextField
                    label={t("checkout.lastName")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                </>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="btn btn-lg btn-primary w-full"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {t("auth.verify")}
                </button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="font-semibold text-brand-500 hover:underline"
                  >
                    {t("auth.otpChange")}
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-brand-500 hover:underline"
                  >
                    {t("auth.otpResend")}
                  </button>
                </div>
              </form>
            )}

            {/*
              Demo credentials, shown only when NEXT_PUBLIC_DEMO_AUTH=1 so a
              production build never advertises a shared code. The stub itself
              lives in lib/demoAuth.ts — one file to delete when real auth lands.
            */}
            {showDemoHint && DEMO_ACCOUNTS.length > 0 && (
              <div className="mt-8 rounded-xl bg-accent-100 p-5 ring-1 ring-accent-500/30 ring-inset">
                <p className="flex items-center gap-2 text-sm font-bold text-accent-700">
                  <FlaskConical className="size-4" />
                  {t("auth.demoTitle")}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                  {t("auth.demoBody")}
                </p>
                <ul className="mt-4 space-y-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <li
                      key={a.phone}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="tnum block font-mono text-sm font-bold text-ink-900">
                          {a.phone}
                        </span>
                        <span className="tnum block text-xs text-ink-500">
                          {t("auth.demoCode")} {DEMO_OTP}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhone(a.phone);
                          setCode(DEMO_OTP);
                          setError("");
                        }}
                        className="btn btn-sm btn-outline shrink-0"
                      >
                        {t("auth.demoFill")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-6 flex items-start gap-2 rounded-xl bg-ink-50 p-5 ring-1 ring-ink-100 ring-inset text-sm text-ink-700">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-brand-500" />
              {t("auth.noAccountNote")}
            </p>

            <p className="mt-4 flex items-start gap-2 text-xs text-ink-500">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              {locale === "fr"
                ? "Nous ne demandons jamais votre code par téléphone ou par SMS. Ne le communiquez à personne."
                : "We never ask for your code by phone or SMS. Do not share it with anyone."}
            </p>

            <p className="mt-6 text-sm text-ink-500">
              <Link href="/help" className="font-semibold text-brand-500 hover:underline">
                {t("nav.help")}
              </Link>
            </p>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <Image
            src="/img/banner-2.svg"
            alt=""
            fill
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-end p-10">
            <div className="max-w-sm text-white">
              <Smartphone className="mb-4 size-8 text-accent-500" />
              <p className="text-xl font-bold">
                {locale === "fr"
                  ? "Votre numéro suffit."
                  : "Your number is enough."}
              </p>
              <p className="mt-2 text-white/75">
                {locale === "fr"
                  ? "Pas besoin d'adresse e-mail. Vos réservations, vos documents et vos demandes sont liés à votre téléphone."
                  : "No email needed. Your bookings, documents and requests are tied to your phone."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
