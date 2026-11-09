import { usePrefs } from "@/lib/prefs";
import { mapHref, type MapKind } from "@/lib/townMap";
import { MapIcon } from "lucide-react";
import Link from "next/link";

/** "See on the map", beside a results page's sort: the town map on this town and kind. */
export default function MapButton({ kind, city }: { kind: MapKind; city?: string }) {
  const { t } = usePrefs();
  return (
    <Link href={mapHref(kind, city)} className="btn btn-outline h-auto rounded-xl px-4 py-2.5 text-sm shadow-xs">
      <MapIcon className="size-4" aria-hidden="true" />
      {t("map.seeOnMap")}
    </Link>
  );
}
