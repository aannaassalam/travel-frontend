import Layout from "@/components/site/Layout";
import { Breadcrumbs } from "@/components/site/bits";
import { getSiteContent, safely, type SiteContent } from "@/lib/api";
import { localized } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Banknote, MapPin, PackageCheck, Users } from "lucide-react";
import { GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";

/** One per block, in order, round again if the office adds a fifth. */
const ICONS = [PackageCheck, Banknote, Users, MapPin];
const BANNER = "/img/hero-river.svg";

/**
 * The wording this page shipped with (message keys). The office edits its own
 * in the admin's "Website content" screen; this is what shows until it has,
 * and whenever the API cannot be reached while the page is being built.
 */
const BUILT_IN = {
  title: "pg.about.title",
  intro: "pg.about.intro",
  sections: [
    { title: "pg.about.buy.title", body: "pg.about.buy.body" },
    { title: "pg.about.pay.title", body: "pg.about.pay.body" },
    { title: "pg.about.team.title", body: "pg.about.team.body" },
    { title: "pg.about.drc.title", body: "pg.about.drc.body" }
  ],
  listTitle: "pg.about.listTitle",
  listItems: ["pg.about.not.terms", "pg.about.not.urgency", "pg.about.not.fees", "pg.about.not.data"]
};

interface Props {
  /** As the office last saved it; null if the API did not answer at build time. */
  about: SiteContent["about"] | null;
}

export default function AboutPage({ about }: Props) {
  const { t, locale } = usePrefs();

  const page = about
    ? {
        title: localized(about.title, locale),
        intro: localized(about.intro, locale),
        sections: about.sections.map((s) => ({
          title: localized(s.title, locale),
          body: localized(s.body, locale)
        })),
        listTitle: localized(about.listTitle, locale),
        listItems: about.listItems.map((line) => localized(line, locale)).filter(Boolean)
      }
    : {
        title: t(BUILT_IN.title),
        intro: t(BUILT_IN.intro),
        sections: BUILT_IN.sections.map((s) => ({ title: t(s.title), body: t(s.body) })),
        listTitle: t(BUILT_IN.listTitle),
        listItems: BUILT_IN.listItems.map((k) => t(k))
      };
  const banner = about?.image ? mediaUrl(about.image) : BANNER;

  return (
    <Layout
      title={t("footer.about")}
      description={(page.sections[0]?.body ?? page.intro).slice(0, 200)}
      image={banner}
    >
      <section className="relative">
        <div className="absolute inset-0">
          <Image
            src={banner}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-brand-900/70" />
        </div>
        <div className="container-site relative py-16">
          <h1 className="display max-w-2xl text-3xl leading-tight text-white sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-2xl text-white/85">{page.intro}</p>
        </div>
      </section>

      <div className="container-site py-10">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("footer.about") }]}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {page.sections.map(({ title, body }, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <section key={i} className="surface p-6">
                <span className="mb-3 inline-flex size-11 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="size-5 text-brand-500" />
                </span>
                <h2 className="mb-2 text-lg font-bold text-brand-900">{title}</h2>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
                  {body}
                </p>
              </section>
            );
          })}
        </div>

        {/* Being upfront about the policy on the About page is deliberate. It is
            the thing customers most need to understand before they pay. */}
        {page.listItems.length > 0 && (
          <section className="mt-8 rounded-lg border-2 border-brand-900 bg-brand-50 p-6">
            <h2 className="text-lg font-bold text-brand-900">{page.listTitle}</h2>
            <ul className="mt-3 space-y-2 text-[15px] text-ink-700">
              {page.listItems.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500" />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/terms#cancellation"
              className="mt-4 inline-flex text-sm font-semibold text-brand-500 underline"
            >
              {t("policy.readFull")}
            </Link>
          </section>
        )}
      </div>
    </Layout>
  );
}

/**
 * ISR, like the legal pages: `revalidate` is what carries an edit made in the
 * admin onto the public site without a deploy.
 */
export const getStaticProps: GetStaticProps<Props> = async () => {
  const site = await safely(() => getSiteContent(), null);
  return { props: { about: site?.about ?? null }, revalidate: 300 };
};
