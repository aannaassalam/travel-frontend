import Layout from "@/components/site/Layout";
import SearchWidget from "@/components/search/SearchWidget";
import { usePrefs } from "@/lib/prefs";
import { Compass } from "lucide-react";
import Link from "next/link";

/**
 * §14: no dead ends. A 404 gets the search widget, not an apology and a link
 * home — the visitor was looking for something, and they still are.
 */
export default function NotFound() {
  const { t, locale } = usePrefs();
  return (
    <Layout title={t("common.notFound")} description={t("common.notFoundBody")} noindex>
      <div className="bg-brand-900 py-12">
        <div className="container-site text-center">
          <Compass className="mx-auto mb-4 size-12 text-accent-500" />
          <h1 className="display text-3xl text-white">{t("common.notFound")}</h1>
          <p className="mx-auto mt-2 max-w-md text-white/75">{t("common.notFoundBody")}</p>
        </div>
        <div className="container-site mt-8">
          <SearchWidget vertical="HOTEL" variant="hero" />
        </div>
      </div>

      <div className="container-site py-10 text-center">
        <p className="text-[15px] text-ink-500">
          {locale === "fr"
            ? "Ou reprenez depuis le début :"
            : "Or start again from the beginning:"}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {[
            ["/", "common.home"],
            ["/flights", "nav.flights"],
            ["/hotels", "nav.hotels"],
            ["/property", "nav.property"],
            ["/help", "nav.help"]
          ].map(([href, key]) => (
            <Link
              key={href}
              href={href}
              className="btn btn-sm btn-outline"
            >
              {t(key)}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
