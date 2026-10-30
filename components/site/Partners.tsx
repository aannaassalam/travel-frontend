import Carousel from "@/components/catalog/Carousel";
import { getPartners, type Partner } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

/**
 * "Our partners": the logos the office adds on the admin's Partners screen, as
 * a strip that slides on by itself, just above the footer of the main pages.
 * Asked once, and the answer is shared from page to page; the home page shows
 * the list it was built with until it comes. A fallback, not `initialData`:
 * the server's one query cache serves every page it renders, and would hand
 * the home's list to all of them — HTML the browser's first render disowns.
 *
 * Every logo sits in a box of the same height and is contained in it, so a
 * wide wordmark and a square badge read as one row, neither cropped. With no
 * partners there is no section at all: an empty "partners" heading says the
 * opposite of what it is there for.
 */
export default function Partners({ partners }: { partners?: Partner[] }) {
  const { t } = usePrefs();
  const { data = partners ?? [] } = useQuery({
    queryKey: ["partners"],
    queryFn: ({ signal }) => getPartners({ signal }),
    // Edited a few times a year.
    staleTime: 5 * 60_000,
    retry: 1
  });
  if (!data.length) return null;

  return (
    <section className="container-site pt-4">
      <Carousel
        label={t("home.partners")}
        title={t("home.partners")}
        itemClassName="w-[160px] sm:w-[180px]"
        autoplay
      >
        {data.map((p) => {
          const logo = (
            <span className="relative block h-14 w-full">
              <Image
                src={mediaUrl(p.logo)}
                alt={p.name}
                fill
                sizes="(min-width: 640px) 180px, 160px"
                className="object-contain"
              />
            </span>
          );
          const tile = "surface flex h-24 items-center px-5";
          return p.website ? (
            <a
              key={p.id}
              href={p.website}
              target="_blank"
              rel="noopener noreferrer"
              className={`${tile} card-lift`}
            >
              {logo}
              <span className="sr-only">{t("home.partnerNewTab")}</span>
            </a>
          ) : (
            <div key={p.id} className={tile}>
              {logo}
            </div>
          );
        })}
      </Carousel>
    </section>
  );
}
