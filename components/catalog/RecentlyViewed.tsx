import { SectionHeading } from "@/components/site/bits";
import { getHotel, getListing } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { getRecentlyViewed } from "@/lib/store";
import { Hotel, Listing } from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DealTile, HotelTile, PropertyTile } from "./cards";

/**
 * Recently viewed rail.
 *
 * Slugs are stored, never snapshots, and each is re-resolved against the API —
 * so a card here always shows today's price and today's availability rather
 * than whatever was true when the visitor last looked. Renders nothing until
 * there is something to show; an empty "recently viewed" heading is worse than
 * no heading.
 */
export default function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const { locale } = usePrefs();
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    setSlugs(
      getRecentlyViewed()
        .filter((s) => s !== excludeSlug)
        .slice(0, 4)
    );
  }, [excludeSlug]);

  const { data } = useQuery({
    queryKey: ["recently-viewed", slugs],
    enabled: slugs.length > 0,
    staleTime: 300_000,
    queryFn: async () => {
      const results = await Promise.all(
        slugs.map(async (slug) => {
          // A slug is either a listing or a hotel; try one, fall back to the
          // other, and drop anything that has since been unpublished.
          try {
            return (await getListing(slug)).listing as Listing | Hotel;
          } catch {
            try {
              return (await getHotel(slug)).hotel as Listing | Hotel;
            } catch {
              return null;
            }
          }
        })
      );
      return results.filter((x): x is Listing | Hotel => Boolean(x));
    }
  });

  const items = data ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <SectionHeading
        title={locale === "fr" ? "Vus récemment" : "Recently viewed"}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) =>
          "roomTypes" in item ? (
            <HotelTile key={item.id} hotel={item} />
          ) : item.vertical === "PROPERTY" ? (
            <PropertyTile key={item.id} listing={item} />
          ) : (
            <DealTile key={item.id} listing={item} />
          )
        )}
      </div>
    </section>
  );
}

/** Records a visit. Called from detail pages; safe to call on every render. */
export function useRecordView(slug: string) {
  useEffect(() => {
    // Imported lazily so the store write never runs during SSR.
    import("@/lib/store").then(({ pushRecentlyViewed }) => pushRecentlyViewed(slug));
  }, [slug]);
}
