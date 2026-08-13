import { usePrefs } from "@/lib/prefs";
import { getSaved, toggleSaved } from "@/lib/store";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Favourites. Stored as slugs so a saved item survives a price change and
 * resolves to whatever the listing looks like today — never a snapshot that
 * quietly shows a stale price.
 */
export default function SaveButton({ slug }: { slug: string }) {
  const { t } = usePrefs();
  const [saved, setSaved] = useState(false);

  useEffect(() => setSaved(getSaved().includes(slug)), [slug]);

  return (
    <button
      type="button"
      onClick={() => setSaved(toggleSaved(slug))}
      aria-pressed={saved}
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
    >
      <Heart className={saved ? "size-4 fill-bad-600 text-bad-600" : "size-4"} />
      {/* The label states what the item IS, not what the click does — the
          unsaved label was `account.saved`, which is the *nav* label for the
          favourites page ("Saved" in English), so the button read "Saved"
          in both states and gave no feedback at all on click.

          Both labels are laid into the same grid cell, so the cell is always
          as wide as the longer of the two and the button never changes size on
          click. A fixed `min-w` cannot do this: "Save" is shorter than "Saved",
          but French "Enregistrer" is *longer* than "Enregistré", so the widest
          label is a different state in each locale. */}
      <span className="grid">
        <span aria-hidden className="invisible col-start-1 row-start-1">
          {t("listing.save")}
        </span>
        <span aria-hidden className="invisible col-start-1 row-start-1">
          {t("listing.saved")}
        </span>
        <span className="col-start-1 row-start-1 text-left">
          {saved ? t("listing.saved") : t("listing.save")}
        </span>
      </span>
    </button>
  );
}
