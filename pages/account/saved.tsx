import AccountLayout from "@/components/account/AccountLayout";
import { DealTile, HotelTile, PropertyTile } from "@/components/catalog/cards";
import { CardSkeleton } from "@/components/ui/field";
import { getHotel, getListing } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { getSaved } from "@/lib/store";
import { Hotel, Listing } from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SavedPage() {
  const { t } = usePrefs();
  return <AccountLayout title={t("account.saved")}>{() => <SavedList />}</AccountLayout>;
}

function SavedList() {
  const { t } = usePrefs();
  const [slugs, setSlugs] = useState<string[] | null>(null);

  useEffect(() => setSlugs(getSaved()), []);

  const { data, isPending } = useQuery({
    queryKey: ["saved", slugs],
    enabled: Array.isArray(slugs) && slugs.length > 0,
    staleTime: 120_000,
    queryFn: async () => {
      // Resolved live against the API, so a saved item always shows today's
      // price and availability — a stored snapshot would quietly go stale.
      const results = await Promise.all(
        slugs!.map(async (slug) => {
          try {
            return (await getListing(slug)).listing as Listing | Hotel;
          } catch {
            try {
              return (await getHotel(slug)).hotel as Listing | Hotel;
            } catch {
              // Unpublished since it was saved. Drop it rather than 404 a card.
              return null;
            }
          }
        })
      );
      return results.filter((x): x is Listing | Hotel => Boolean(x));
    }
  });

  if (slugs === null || (slugs.length > 0 && isPending)) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const items = data ?? [];
  if (items.length === 0) {
    return (
      <div className="surface p-12 text-center">
        <p className="font-semibold text-brand-900">{t("account.noSaved")}</p>
        <Link href="/" className="btn btn-md btn-primary mt-5">
          {t("account.browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}
