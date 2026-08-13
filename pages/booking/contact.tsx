import { HoldBanner, Stepper, Summary } from "@/components/checkout/parts";
import { TextField } from "@/components/ui/field";
import Layout from "@/components/site/Layout";
import { useCheckout } from "@/lib/checkout";
import { isEmail, normalisePhone } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { getUser } from "@/lib/store";
import { Info, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * §11.3 step 2 of 3 — contact details.
 *
 * §2.1 deferred account creation is resolved here: the customer is never
 * blocked, and the account is created behind the scenes from the phone number
 * so every booking still has an owner.
 */
export default function ContactStep() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const { ready, selection, travellers, contact, update, expired } = useCheckout();

  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    createAccount: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ready && !selection) router.replace("/");
  }, [ready, selection, router]);

  // Prefill from the lead traveller, or from a signed-in customer. Retyping a
  // name you entered on the previous screen is the fastest way to lose someone.
  useEffect(() => {
    if (!ready) return;
    const user = getUser();
    setValues((v) => ({
      ...v,
      firstName: contact?.firstName || user?.firstName || travellers[0]?.firstName || "",
      lastName: contact?.lastName || user?.lastName || travellers[0]?.lastName || "",
      phone: contact?.phone || user?.phone || "",
      email: contact?.email || user?.email || ""
    }));
  }, [ready, contact, travellers]);

  if (!ready || !selection) return null;

  const set = (k: string, v: string | boolean) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.firstName.trim() || !values.lastName.trim()) next.name = t("err.name");
    const phone = normalisePhone(values.phone);
    if (!phone) next.phone = t("err.phone");
    if (values.email && !isEmail(values.email)) next.email = t("err.email");
    setErrors(next);
    if (Object.keys(next).length) return;

    update({
      contact: {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: phone!,
        email: values.email.trim() || undefined,
        createAccount: values.createAccount
      }
    });
    router.push("/booking/payment");
  }

  return (
    <Layout title={t("checkout.step2")} description={t("checkout.step2")} noindex>
      <div className="container-site py-8">
        <Stepper current={2} />
        <HoldBanner />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submit} noValidate className="space-y-6">
            <div className="surface p-6">
              <h1 className="mb-1 text-xl font-bold text-brand-900">
                {t("checkout.contact")}
              </h1>
              <p className="mb-5 text-sm text-ink-500">{t("checkout.contactNote")}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={t("checkout.firstName")}
                  value={values.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  error={errors.name}
                  autoComplete="given-name"
                />
                <TextField
                  label={t("checkout.lastName")}
                  value={values.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  autoComplete="family-name"
                />
                <TextField
                  className="sm:col-span-2"
                  label={t("auth.phone")}
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  error={errors.phone}
                  inputMode="tel"
                  autoComplete="tel"
                  helper={errors.phone ? undefined : "+243 81 000 00 00"}
                />
                <TextField
                  className="sm:col-span-2"
                  label={t("rtb.email")}
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                  helper={
                    errors.email
                      ? undefined
                      : locale === "fr"
                        ? "Facultatif — la confirmation part par SMS de toute façon."
                        : "Optional — the confirmation goes by SMS regardless."
                  }
                />
              </div>
            </div>

            {/* §2.1: both "account required" and "guest checkout" satisfied. */}
            <div className="surface p-6">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-900">
                <UserPlus className="size-4 text-brand-500" />
                {locale === "fr" ? "Suivi de votre réservation" : "Tracking your booking"}
              </h2>
              <div className="space-y-3">
                <label className="flex cursor-pointer gap-3 rounded-xl p-4 ring-1 ring-ink-100 ring-inset transition-colors has-checked:bg-brand-50 has-checked:ring-2 has-checked:ring-brand-500">
                  <input
                    type="radio"
                    name="account"
                    checked={values.createAccount}
                    onChange={() => set("createAccount", true)}
                    className="mt-0.5 size-4 accent-brand-500"
                  />
                  <span>
                    <span className="block font-semibold text-ink-900">
                      {locale === "fr"
                        ? "Créer mon compte avec ce numéro"
                        : "Create my account with this number"}
                    </span>
                    <span className="block text-sm text-ink-500">
                      {t("checkout.guestNote")}
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer gap-3 rounded-xl p-4 ring-1 ring-ink-100 ring-inset transition-colors has-checked:bg-brand-50 has-checked:ring-2 has-checked:ring-brand-500">
                  <input
                    type="radio"
                    name="account"
                    checked={!values.createAccount}
                    onChange={() => set("createAccount", false)}
                    className="mt-0.5 size-4 accent-brand-500"
                  />
                  <span>
                    <span className="block font-semibold text-ink-900">
                      {t("checkout.guest")}
                    </span>
                    <span className="block text-sm text-ink-500">
                      {locale === "fr"
                        ? "Vous recevrez tout de même un lien SMS pour retrouver la réservation plus tard."
                        : "You will still get an SMS link to find the booking later."}
                    </span>
                  </span>
                </label>
              </div>

              <p className="mt-3 flex items-start gap-2 text-xs text-ink-500">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {locale === "fr" ? (
                  <span>
                    Déjà client ?{" "}
                    <Link href="/login" className="text-brand-500 underline">
                      Connectez-vous
                    </Link>{" "}
                    pour retrouver vos coordonnées.
                  </span>
                ) : (
                  <span>
                    Already a customer?{" "}
                    <Link href="/login" className="text-brand-500 underline">
                      Sign in
                    </Link>{" "}
                    to reuse your details.
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/booking/travellers")}
                className="btn btn-md btn-outline"
              >
                {t("checkout.back")}
              </button>
              <button
                type="submit"
                disabled={expired}
                className="btn btn-lg btn-primary"
              >
                {t("checkout.continue")}
              </button>
            </div>
          </form>

          <Summary />
        </div>
      </div>
    </Layout>
  );
}
