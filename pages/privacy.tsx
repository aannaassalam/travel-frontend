import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { localized } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { parsePolicyBody } from "@/lib/policy";
import { getPolicy, safely, type Policy } from "@/lib/api";
import { Lock } from "lucide-react";
import type { GetStaticProps } from "next";

/**
 * §12.4: both stores require a reachable privacy policy URL, and the Data
 * Safety / Privacy Nutrition Label declarations must match what is actually
 * collected. This page is the source of truth those declarations copy from,
 * so it lists real fields rather than boilerplate.
 */
/** The wording built into the site, as message keys. */
const SECTIONS = [
  { heading: "pg.privacy.collect.heading", body: "pg.privacy.collect.body" },
  { heading: "pg.privacy.notCollect.heading", body: "pg.privacy.notCollect.body" },
  { heading: "pg.privacy.keep.heading", body: "pg.privacy.keep.body" },
  { heading: "pg.privacy.protect.heading", body: "pg.privacy.protect.body" },
  { heading: "pg.privacy.share.heading", body: "pg.privacy.share.body" },
  { heading: "pg.privacy.rights.heading", body: "pg.privacy.rights.body" },
  { heading: "pg.privacy.contact.heading", body: "pg.privacy.contact.body" }
];

/**
 * Same contract as /terms: the published version wins, the constant above is
 * the fallback. §12.4 makes this page load-bearing for both app stores, so it
 * must render even when the API is unreachable.
 */
export default function PrivacyPage({ privacy }: { privacy: Policy | null }) {
  const { t, locale } = usePrefs();
  const published = localized(privacy?.bodies, locale);
  const parsed = published ? parsePolicyBody(published) : [];
  // Nothing published (or the API unreachable) is the only case that shows the
  // wording built into the site; a text without headings is still the office's.
  const sections = parsed.length
    ? parsed
    : SECTIONS.map((s) => ({ heading: t(s.heading), body: t(s.body) }));

  return (
    <Layout
      title={t("footer.privacy")}
      description={sections[0].body.slice(0, 200)}
      image="/img/banner-2.svg"
    >
      <div className="container-site max-w-3xl py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("footer.privacy") }]}
        />
        <h1 className="display text-3xl text-brand-900">
          {t("footer.privacy")}
        </h1>

        <p className="mt-6 flex items-start gap-3 rounded-card bg-brand-50 p-6 ring-1 ring-brand-100 ring-inset text-[15px] text-ink-900">
          <Lock className="mt-0.5 size-5 shrink-0 text-brand-500" />
          {t("pg.privacy.lead")}
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              {s.heading && (
                <h2 className="mb-2 text-xl font-bold text-brand-900">{s.heading}</h2>
              )}
              {/* pre-line: the paragraphs the office typed stay paragraphs. */}
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<{ privacy: Policy | null }> = async () => ({
  props: { privacy: await safely(() => getPolicy("PRIVACY"), null) },
  revalidate: 300
});
