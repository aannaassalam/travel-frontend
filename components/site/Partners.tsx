import { SectionHeading } from "@/components/site/bits";
import type { Partner } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import Image from "next/image";

/**
 * "Our partners": the logos the office adds on the admin's Partners screen.
 *
 * Every logo sits in a box of the same height and is contained in it, so a
 * wide wordmark and a square badge read as one row, neither cropped. With no
 * partners there is no section at all: an empty "partners" heading says the
 * opposite of what it is there for.
 */
export default function Partners({ partners }: { partners: Partner[] }) {
  const { t } = usePrefs();
  if (!partners.length) return null;

  return (
    <section className="container-site pb-20">
      <SectionHeading title={t("home.partners")} />
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {partners.map((p) => {
          const logo = (
            <span className="relative block h-14 w-full">
              <Image
                src={mediaUrl(p.logo)}
                alt={p.name}
                fill
                sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
                className="object-contain"
              />
            </span>
          );
          const tile = "surface flex h-24 items-center px-5";
          return (
            <li key={p.id}>
              {p.website ? (
                <a
                  href={p.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${tile} card-lift`}
                >
                  {logo}
                  <span className="sr-only">{t("home.partnerNewTab")}</span>
                </a>
              ) : (
                <div className={tile}>{logo}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
