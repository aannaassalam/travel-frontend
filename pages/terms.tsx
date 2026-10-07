import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { usePrefs } from "@/lib/prefs";
import {
  CURRENT_POLICY,
  POLICY_SECTIONS,
  parsePolicyBody,
  policyText
} from "@/lib/policy";
import { getPolicy, safely, type Policy } from "@/lib/api";
import { ShieldAlert } from "lucide-react";
import type { GetStaticProps } from "next";

type Props = { terms: Policy | null; noRefund: Policy | null };

/**
 * §12 / §15: the text lives in the admin's content section, not in this file.
 * The hardcoded constants stay as a fallback and are deliberately NOT deleted —
 * a legal page that renders empty because the API blipped is worse than one
 * showing the last text a developer shipped, and this page is linked from every
 * point where consent is captured.
 */
export default function TermsPage({ terms, noRefund }: Props) {
  const { t, locale } = usePrefs();

  const published = terms?.bodies[locale] ?? terms?.bodies.fr;
  const parsed = published ? parsePolicyBody(published) : [];
  const sections = parsed.length
    ? parsed
    : POLICY_SECTIONS[locale]?.length
      ? POLICY_SECTIONS[locale]
      : POLICY_SECTIONS.fr;

  const consent =
    noRefund?.bodies[locale] ?? noRefund?.bodies.fr ?? policyText(locale);
  const label = terms?.label ?? CURRENT_POLICY.label;
  const effectiveFrom = terms?.effectiveFrom ?? CURRENT_POLICY.effectiveFrom;

  return (
    <Layout
      title={t("footer.terms")}
      description={t("policy.body")}
      image="/img/banner-1.svg"
    >
      <div className="container-site max-w-3xl py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("footer.terms") }]}
        />
        <h1 className="display text-3xl text-brand-900">
          {t("footer.terms")}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {locale === "fr" ? "Version" : "Version"} {label} ·{" "}
          {locale === "fr" ? "en vigueur depuis le" : "in force since"}{" "}
          {effectiveFrom}
        </p>

        {/* §2.2(3): stated plainly, at the top, never in fine print. */}
        <section
          id="no-refund"
          className="mt-8 scroll-mt-24 rounded-lg border-2 border-brand-900 bg-brand-50 p-6"
        >
          <h2 className="flex items-center gap-2 text-xl font-bold text-brand-900">
            <ShieldAlert className="size-6 text-brand-500" />
            {t("policy.title")}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-900">
            {t("policy.body")}
          </p>
          <p className="mt-4 rounded-md bg-white p-4 text-[15px] font-medium text-ink-900">
            « {consent} »
          </p>
          <p className="mt-3 text-sm text-ink-500">
            {locale === "fr"
              ? "Cette phrase exacte vous est présentée à l'étape de paiement, sous forme de case à cocher distincte. Votre acceptation est horodatée et conservée avec votre réservation."
              : "That exact sentence is shown to you at the payment step as a separate checkbox. Your acceptance is timestamped and stored with your booking."}
          </p>
        </section>

        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-xl font-bold text-brand-900">{s.heading}</h2>
              <p className="text-[15px] leading-relaxed text-ink-700">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}

/**
 * ISR, not SSR: legal text changes a few times a year but is linked from every
 * footer. `revalidate` is what makes "publish in the admin" reach the public
 * site without a deploy — that is the entire point of the content section.
 */
export const getStaticProps: GetStaticProps<Props> = async () => {
  const [terms, noRefund] = await Promise.all([
    safely(() => getPolicy("TERMS"), null),
    safely(() => getPolicy("NO_REFUND"), null)
  ]);
  return { props: { terms, noRefund }, revalidate: 300 };
};
