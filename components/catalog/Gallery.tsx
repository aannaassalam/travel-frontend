import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { mediaUrls } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Images } from "lucide-react";
import Image from "next/image";

/**
 * §11.2 photography-led detail page: one hero plus a grid, full set in a
 * dialog. Images are `sizes`-hinted so a phone on 3G never downloads the
 * desktop asset (§11.7).
 */
export default function Gallery({
  images,
  alt
}: {
  images: string[];
  alt: string;
}) {
  const { t, lowData } = usePrefs();
  /**
   * Resolved once, and every render below reads from THIS list — never from
   * the raw `images` prop. The stored value is `/uploads/<folder>/<uuid>.png`,
   * which is relative to the API host; handing it to next/image unresolved
   * makes the browser ask this app for a file it does not have, and the
   * optimiser answers 400. That is exactly what the dialog used to do.
   */
  const resolved = mediaUrls(images);
  const [hero, ...rest] = resolved;
  const grid = rest.slice(0, 4);

  if (lowData) {
    return (
      <div className="relative h-56 overflow-hidden rounded-lg sm:h-72">
        <Image src={hero} alt={alt} fill sizes="100vw" className="object-cover" priority />
      </div>
    );
  }

  /**
   * The thumbnails fill a 2×2 cell block beside the hero. Rather than padding
   * short galleries with blank panels — which read as failed image loads — the
   * remaining photos stretch to fill the block.
   */
  const SPANS: Record<number, string[]> = {
    1: ["md:col-span-2 md:row-span-2"],
    2: ["md:col-span-2", "md:col-span-2"],
    3: ["", "", "md:col-span-2"],
    4: ["", "", "", ""]
  };
  const spans = SPANS[grid.length] ?? [];

  return (
    <div className="relative">
      <div className="grid gap-2.5 overflow-hidden rounded-xl2 md:grid-cols-4 md:grid-rows-2">
        <div
          className={`relative h-64 md:h-full md:min-h-95 ${
            grid.length ? "md:col-span-2 md:row-span-2" : "md:col-span-4 md:row-span-2"
          }`}
        >
          <Image
            src={hero}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
            priority
          />
        </div>
        {grid.map((src, i) => (
          <div
            key={src + i}
            className={`relative hidden min-h-46 md:block ${spans[i] ?? ""}`}
          >
            <Image
              src={src}
              alt={`${alt} — ${i + 2}`}
              fill
              sizes="360px"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-900 shadow-md hover:bg-ink-50"
          >
            <Images className="size-4" />
            {t("listing.gallery", { n: resolved.length })}
          </button>
        </DialogTrigger>
        <DialogContent
          className="max-h-[90vh] max-w-4xl overflow-y-auto"
          // The title names the dialog; there is no prose to describe it, and
          // Radix warns on every open unless the absence is stated explicitly.
          aria-describedby={undefined}
        >
          <DialogTitle className="text-lg font-bold text-brand-900">{alt}</DialogTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {resolved.map((src, i) => (
              <div key={src + i} className="relative h-56 overflow-hidden rounded-md">
                <Image
                  src={src}
                  alt={`${alt} — ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
