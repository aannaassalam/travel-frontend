import { HoldBanner, Stepper, Summary } from "@/components/checkout/parts";
import { SelectField, TextField } from "@/components/ui/field";
import Layout from "@/components/site/Layout";
import { useCheckout } from "@/lib/checkout";
import { usePrefs } from "@/lib/prefs";
import { Traveller } from "@/typescript/interface/domain.interface";
import { Lock } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/** §11.3 step 1 of 3 — traveller details. */
export default function TravellersStep() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const { ready, selection, travellers, update, expired } = useCheckout();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Nothing selected means the customer deep-linked or the session was cleared.
  useEffect(() => {
    if (ready && !selection) router.replace("/");
  }, [ready, selection, router]);

  if (!ready || !selection) return null;

  const needsDocuments = selection.vertical === "FLIGHT";

  function setTraveller(i: number, patch: Partial<Traveller>) {
    const next = travellers.map((tr, idx) => (idx === i ? { ...tr, ...patch } : tr));
    update({ travellers: next });
    setErrors({});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    travellers.forEach((tr, i) => {
      if (!tr.firstName.trim()) next[`${i}.firstName`] = t("err.required");
      if (!tr.lastName.trim()) next[`${i}.lastName`] = t("err.required");
      if (needsDocuments && !tr.documentNumberMasked?.trim()) {
        next[`${i}.documentNumber`] = t("err.required");
      }
    });
    setErrors(next);
    if (Object.keys(next).length) return;
    router.push("/booking/contact");
  }

  return (
    <Layout
      title={t("checkout.step1")}
      description={t("checkout.step1")}
      noindex
    >
      <div className="container-site py-8">
        <Stepper current={1} />
        <HoldBanner />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submit} noValidate className="space-y-6">
            <div className="surface p-6">
              <h1 className="mb-1 text-xl font-bold text-brand-900">
                {t("checkout.step1")}
              </h1>
              <p className="mb-5 text-sm text-ink-500">
                {locale === "fr"
                  ? "Les noms doivent correspondre exactement à la pièce d'identité présentée au départ."
                  : "Names must match the identity document presented at departure exactly."}
              </p>

              <div className="space-y-6">
                {travellers.map((tr, i) => (
                  <fieldset key={i} className="border-t border-ink-100/70 pt-5 first:border-0 first:pt-0">
                    <legend className="mb-3 text-sm font-bold text-brand-900">
                      {i === 0
                        ? t("checkout.leadGuest")
                        : t("checkout.traveller", { n: i + 1 })}
                    </legend>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        label={t("checkout.firstName")}
                        value={tr.firstName}
                        onChange={(e) => setTraveller(i, { firstName: e.target.value })}
                        error={errors[`${i}.firstName`]}
                        autoComplete={i === 0 ? "given-name" : "off"}
                      />
                      <TextField
                        label={t("checkout.lastName")}
                        value={tr.lastName}
                        onChange={(e) => setTraveller(i, { lastName: e.target.value })}
                        error={errors[`${i}.lastName`]}
                        autoComplete={i === 0 ? "family-name" : "off"}
                      />

                      {needsDocuments && (
                        <>
                          <TextField
                            label={t("checkout.dob")}
                            type="date"
                            value={tr.dateOfBirth ?? ""}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setTraveller(i, { dateOfBirth: e.target.value })}
                          />
                          <SelectField
                            label={t("checkout.docType")}
                            value={tr.documentType ?? "PASSPORT"}
                            onChange={(e) =>
                              setTraveller(i, {
                                documentType: e.target.value as Traveller["documentType"]
                              })
                            }
                            options={[
                              {
                                value: "PASSPORT",
                                label: locale === "fr" ? "Passeport" : "Passport"
                              },
                              {
                                value: "ID",
                                label: locale === "fr" ? "Carte d'identité" : "National ID"
                              },
                              { value: "OTHER", label: locale === "fr" ? "Autre" : "Other" }
                            ]}
                          />
                          <div className="sm:col-span-2">
                            <TextField
                              label={t("checkout.docNumber")}
                              value={tr.documentNumberMasked ?? ""}
                              onChange={(e) =>
                                setTraveller(i, { documentNumberMasked: e.target.value })
                              }
                              error={errors[`${i}.documentNumber`]}
                              autoComplete="off"
                            />
                            {/* §10.5: say what happens to it, and mean it. */}
                            <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
                              <Lock className="mt-0.5 size-3.5 shrink-0" />
                              {t("checkout.docNote")}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
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
