import Layout from "@/components/site/Layout";
import { PasswordField, TextField } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/PhoneField";
import { ApiError } from "@/lib/api";
import { DEFAULT_COUNTRY, toE164 } from "@/lib/countries";
import { maskPhone } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import {
  useLogin,
  useRequestOtp,
  useResetPassword,
  useVerifyOtp
} from "@/lib/session";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

/**
 * §7.1/§7.2 — the phone is still the identity, but it is only proved by SMS
 * ONCE, when the account is created. After that it is number + password.
 *
 * That is a cost decision as much as a UX one: every code is a paid message to
 * a network that is not always reachable, and a customer standing in a booking
 * office with no signal could not get into their own account. A password works
 * offline-ish, works on a borrowed handset, and works when Twilio is having a
 * bad afternoon. The SMS is kept for the two moments where possession of the
 * handset is the only thing we can trust: creating the account, and recovering
 * it.
 *
 * §7.4 anti-enumeration: sign-in fails with one message for every cause, so
 * this screen never reveals whether a number is registered. Sign-up is the
 * exception and unavoidably so — "this number already has an account" is the
 * only useful thing to say to someone who is about to create a second one.
 */

const MIN_PASSWORD = 8;
/** Matches the server's resend cooldown, so the button re-enables when it works. */
const RESEND_SECONDS = 60;

type Mode = "signin" | "signup" | "forgot";

export default function SignInPage() {
  const { t, locale } = usePrefs();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");

  /**
   * A link can open a specific flow: the confirmation page's "set my password"
   * sends a guest to `?mode=signup`, because the sign-in tab is meaningless to
   * someone who has no password yet. Read once the router knows its query;
   * anything unrecognised falls back to sign-in.
   */
  useEffect(() => {
    if (!router.isReady) return;
    const wanted = String(router.query.mode ?? "");
    if (wanted === "signup" || wanted === "forgot") setMode(wanted);
  }, [router.isReady, router.query.mode]);
  /** Only the two SMS flows have a second step; sign-in is a single form. */
  const [sent, setSent] = useState(false);

  /**
   * Country and national number are held separately, so the dialling code is a
   * choice rather than something to remember to type. E.164 is assembled from
   * the pair - see lib/countries.
   */
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"phone" | "password" | "code" | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  const sendCode = useRequestOtp();
  const signUp = useVerifyOtp();
  const signIn = useLogin();
  const reset = useResetPassword();

  const e164 = toE164(country, phone);

  // The resend countdown. Nothing else ticks on this page, so one interval that
  // stops at zero is the whole mechanism.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  /** Moving between flows must not carry a half-typed code or a stale error. */
  function go(next: Mode) {
    setMode(next);
    setSent(false);
    setCode("");
    setPassword("");
    setError("");
    setFieldError(null);
  }

  function clearError() {
    setError("");
    setFieldError(null);
  }

  /**
   * The server's `code` is the contract; its English message is a fallback for
   * anything new. Translating here is what keeps a French customer from being
   * told "That code is not valid" in the middle of a French page.
   */
  function show(err: unknown) {
    const known: Record<string, { message: string; field: typeof fieldError }> = {
      BAD_CREDENTIALS: { message: t("auth.badCredentials"), field: "password" },
      OTP_INVALID: { message: t("auth.otpInvalid"), field: "code" },
      OTP_LOCKED: { message: t("auth.otpInvalid"), field: "code" },
      PASSWORD_WEAK: { message: t("err.password"), field: "password" },
      ACCOUNT_EXISTS: { message: t("auth.accountExists"), field: null },
      NO_ACCOUNT: { message: t("auth.noAccountYet"), field: null }
    };
    const hit = err instanceof ApiError && err.code ? known[err.code] : undefined;
    setError(hit?.message ?? (err instanceof Error ? err.message : t("err.required")));
    setFieldError(hit?.field ?? null);
  }

  async function run(fn: () => Promise<void>) {
    clearError();
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      show(err);
    } finally {
      setBusy(false);
    }
  }

  const done = () => router.push(String(router.query.next || "/account"));

  /**
   * Real endpoint. The server answers identically whether or not the number is
   * known (§7.4) and rate-limits to 10/hour — an SMS costs money and points at
   * a handset the caller chose, so an unthrottled version of this is both a
   * security hole and a way to bill us for harassing a stranger.
   */
  const requestCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!e164) {
      setError(t("err.phone"));
      setFieldError("phone");
      return;
    }
    return run(async () => {
      await sendCode.mutateAsync(e164);
      setSent(true);
      setCooldown(RESEND_SECONDS);
      // The code is the only thing being asked for now; put the caret in it.
      setTimeout(() => codeRef.current?.focus(), 0);
    });
  };

  const submitSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!e164) {
      setError(t("err.phone"));
      setFieldError("phone");
      return;
    }
    return run(async () => {
      await signIn.mutateAsync({ phone: e164, password });
      done();
    });
  };

  const submitSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(code)) {
      setError(t("err.otp"));
      setFieldError("code");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t("err.password"));
      setFieldError("password");
      return;
    }
    return run(async () => {
      await signUp.mutateAsync({
        phone: e164!,
        code,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        password
      });
      done();
    });
  };

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(code)) {
      setError(t("err.otp"));
      setFieldError("code");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t("err.password"));
      setFieldError("password");
      return;
    }
    return run(async () => {
      await reset.mutateAsync({ phone: e164!, code, password });
      done();
    });
  };

  const heading =
    mode === "signin"
      ? t("auth.title")
      : mode === "signup"
        ? t("auth.signUp")
        : t("auth.forgotTitle");
  const subheading =
    mode === "signin"
      ? t("auth.subtitle")
      : mode === "signup"
        ? t("auth.signUpSubtitle")
        : t("auth.forgotSubtitle");

  /** The one place a page-level error is rendered, so it cannot be duplicated. */
  const banner =
    error && !fieldError ? (
      <p
        role="alert"
        className="rounded-xl bg-bad-100 px-4 py-3 text-sm font-medium text-bad-600 ring-1 ring-bad-600/15 ring-inset"
      >
        {error}
      </p>
    ) : null;

  const codeInput = (
    <label className="block">
      <span className="eyebrow mb-2 block text-brand-600">{t("auth.otpTitle")}</span>
      {/* Six wide, tracked digits: the code is the thing being asked for, so it
          gets the whole field. `one-time-code` lets the OS offer it from the SMS. */}
      <input
        ref={codeRef}
        className="w-full rounded-xl bg-white py-4 text-center font-mono text-3xl font-bold tracking-[0.4em] text-ink-900 shadow-xs ring-1 ring-ink-100 outline-none ring-inset focus:ring-2 focus:ring-brand-500 aria-invalid:ring-2 aria-invalid:ring-bad-600"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
          clearError();
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        aria-invalid={fieldError === "code"}
        aria-describedby={fieldError === "code" ? "code-error" : undefined}
      />
      {fieldError === "code" && (
        <p id="code-error" role="alert" className="mt-2 text-sm font-medium text-bad-600">
          {error}
        </p>
      )}
    </label>
  );

  const codeStepFooter = (
    <div className="flex items-center justify-between text-sm">
      <button
        type="button"
        onClick={() => {
          setSent(false);
          setCode("");
          clearError();
        }}
        className="font-semibold text-brand-500 hover:underline"
      >
        {t("auth.otpChange")}
      </button>
      <button
        type="button"
        onClick={() => requestCode()}
        disabled={busy || cooldown > 0}
        className="font-semibold text-brand-500 hover:underline disabled:text-ink-300 disabled:no-underline"
      >
        {cooldown > 0 ? `${t("auth.otpResend")} (${cooldown}s)` : t("auth.otpResend")}
      </button>
    </div>
  );

  return (
    <Layout title={heading} description={subheading} noindex>
      <div className="grid lg:grid-cols-2">
        <div className="flex items-center justify-center px-4 py-14">
          <div className="w-full max-w-md">
            {/* Two-step flows say where they are. One line beats a progress bar
                for a journey this short, and it stops "enter the code" feeling
                like the form changed under you. */}
            {mode !== "signin" && (
              <p className="mb-2 text-sm font-semibold text-brand-600">
                {locale === "fr"
                  ? `Étape ${sent ? 2 : 1} sur 2`
                  : `Step ${sent ? 2 : 1} of 2`}
              </p>
            )}
            <h1 className="display text-2xl text-brand-900 sm:text-3xl">{heading}</h1>
            <p className="mt-2 text-[15px] text-ink-500">{subheading}</p>

            {mode === "signin" && (
              <form onSubmit={submitSignIn} noValidate className="mt-8 space-y-4">
                {banner}
                <PhoneField
                  label={t("auth.phone")}
                  country={country}
                  national={phone}
                  onCountryChange={(c) => {
                    setCountry(c);
                    clearError();
                  }}
                  onNationalChange={(v) => {
                    setPhone(v);
                    clearError();
                  }}
                  error={fieldError === "phone" ? error : undefined}
                  autoFocus
                />
                <PasswordField
                  label={t("auth.password")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  autoComplete="current-password"
                  error={fieldError === "password" ? error : undefined}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => go("forgot")}
                    className="text-sm font-semibold text-brand-500 hover:underline"
                  >
                    {t("auth.forgot")}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={busy || !e164 || !password}
                  className="btn btn-lg btn-primary w-full"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {t("auth.signInCta")}
                </button>
              </form>
            )}

            {mode === "signup" && !sent && (
              <form onSubmit={requestCode} noValidate className="mt-8 space-y-4">
                {banner}
                <PhoneField
                  label={t("auth.phone")}
                  country={country}
                  national={phone}
                  onCountryChange={(c) => {
                    setCountry(c);
                    clearError();
                  }}
                  onNationalChange={(v) => {
                    setPhone(v);
                    clearError();
                  }}
                  error={fieldError === "phone" ? error : undefined}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={busy || !e164}
                  className="btn btn-lg btn-primary w-full"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {t("auth.sendOtp")}
                </button>
              </form>
            )}

            {mode === "signup" && sent && (
              <form onSubmit={submitSignUp} noValidate className="mt-8 space-y-4">
                {banner}
                <p className="rounded-md bg-brand-50 px-4 py-3 text-sm text-ink-700">
                  {t("auth.signupOtpBody", { phone: maskPhone(e164 ?? phone) })}
                </p>
                {codeInput}
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label={t("checkout.firstName")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                  <TextField
                    label={t("checkout.lastName")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <PasswordField
                  label={t("auth.password")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  autoComplete="new-password"
                  helper={t("auth.passwordHint")}
                  error={fieldError === "password" ? error : undefined}
                />
                <button
                  type="submit"
                  disabled={busy || !firstName.trim()}
                  className="btn btn-lg btn-primary w-full"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {t("auth.signUpCta")}
                </button>
                {codeStepFooter}
              </form>
            )}

            {mode === "forgot" && !sent && (
              <form onSubmit={requestCode} noValidate className="mt-8 space-y-4">
                {banner}
                <PhoneField
                  label={t("auth.phone")}
                  country={country}
                  national={phone}
                  onCountryChange={(c) => {
                    setCountry(c);
                    clearError();
                  }}
                  onNationalChange={(v) => {
                    setPhone(v);
                    clearError();
                  }}
                  error={fieldError === "phone" ? error : undefined}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={busy || !e164}
                  className="btn btn-lg btn-primary w-full"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {t("auth.sendOtp")}
                </button>
              </form>
            )}

            {mode === "forgot" && sent && (
              <form onSubmit={submitReset} noValidate className="mt-8 space-y-4">
                {banner}
                <p className="rounded-md bg-brand-50 px-4 py-3 text-sm text-ink-700">
                  {t("auth.otpBody", { phone: maskPhone(e164 ?? phone) })}
                </p>
                {codeInput}
                <PasswordField
                  label={t("auth.newPassword")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  autoComplete="new-password"
                  helper={t("auth.passwordHint")}
                  error={fieldError === "password" ? error : undefined}
                />
                <button type="submit" disabled={busy} className="btn btn-lg btn-primary w-full">
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {t("auth.resetCta")}
                </button>
                {codeStepFooter}
              </form>
            )}

            <p className="mt-6 text-sm text-ink-500">
              {mode === "signin" ? (
                <>
                  {locale === "fr" ? "Nouveau ici ?" : "New here?"}{" "}
                  <button
                    type="button"
                    onClick={() => go("signup")}
                    className="font-semibold text-brand-500 hover:underline"
                  >
                    {t("auth.signUp")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => go("signin")}
                  className="font-semibold text-brand-500 hover:underline"
                >
                  {t("auth.backToSignIn")}
                </button>
              )}
            </p>

            <p className="mt-6 flex items-start gap-2 rounded-xl bg-ink-50 p-5 text-sm text-ink-700 ring-1 ring-ink-100 ring-inset">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-brand-500" />
              {t("auth.noAccountNote")}
            </p>

            <p className="mt-4 flex items-start gap-2 text-xs text-ink-500">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              {locale === "fr"
                ? "Nous ne demandons jamais votre code ni votre mot de passe par téléphone ou par SMS."
                : "We never ask for your code or password by phone or SMS. Do not share them with anyone."}
            </p>

            <p className="mt-6 text-sm text-ink-500">
              <Link href="/help" className="font-semibold text-brand-500 hover:underline">
                {t("nav.help")}
              </Link>
            </p>
          </div>
        </div>

        {/*
          Sourced at 1100×1490 for this panel specifically, not reused from the
          card library where every file is 720×900 and goes soft stretched
          across half a screen.

          A stilt fishermen's village at Yaligimba, Mongala — Toza Productions.
          Still water, deep green forest and a long reflection: calm rather than
          dramatic, which is what an account screen wants, and its greens sit
          with the brand navy and teal instead of fighting them. Credited in
          public/img/photos/credits.json.

          Desktop only: at `lg` and below the form takes the whole width, so a
          phone never pays for these pixels — which matters in this market.
        */}
        <div className="relative hidden lg:block">
          <Image
            src="/img/photos/yaligimba-village.webp"
            alt=""
            fill
            sizes="50vw"
            priority
            className="object-cover"
          />
          {/* White text needs its own ground; weighted to the bottom so the
              landscape keeps the top two-thirds. */}
          <div
            className="absolute inset-0 bg-linear-to-t from-brand-900/92 via-brand-900/35 to-brand-900/5"
            aria-hidden
          />
          <div className="absolute inset-0 flex items-end p-10">
            <div className="max-w-sm text-white">
              <p className="display text-2xl leading-tight">
                {locale === "fr" ? "Votre numéro suffit." : "Your number is enough."}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-white/75">
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
