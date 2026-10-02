import Lightbox from "@/components/catalog/Lightbox";
import { mediaUrls } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Images } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

/**
 * §11.2 photography-led detail page: one hero, a strip of thumbnails that
 * swap it, and a "Photos" grid of the full set. Any of them opens the
 * Lightbox on that photo. Images are `sizes`-hinted so a phone on 3G never
 * downloads the desktop asset (§11.7).
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
  // Which photo is the hero, and which one the lightbox is open on (null:
  // closed).
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const hero = resolved[current] ?? resolved[0];

  if (lowData) {
    return (
      <div className="relative h-56 overflow-hidden rounded-lg sm:h-72">
        <Image
          src={resolved[0]}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl2">
        <button
          type="button"
          onClick={() => setOpen(current)}
          className="relative block h-64 w-full sm:h-80 md:h-105"
        >
          <Image
            src={hero}
            alt={alt}
            fill
            sizes="(max-width: 1280px) 100vw, 1248px"
            className="object-cover"
            priority
          />
        </button>
        <button
          type="button"
          onClick={() => setOpen(current)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-900 shadow-md hover:bg-ink-50"
        >
          <Images className="size-4" />
          {resolved.length === 1
            ? t("listing.gallery1")
            : t("listing.gallery", { n: resolved.length })}
        </button>
      </div>

      {resolved.length > 1 && (
        <>
          <div className="mt-2 flex gap-2 overflow-x-auto p-1">
            {resolved.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-current={i === current || undefined}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ${
                  i === current
                    ? "ring-2 ring-brand-900"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt={`${alt} — ${i + 1}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>

        </>
      )}

      <Lightbox images={resolved} alt={alt} index={open} onChange={setOpen} />
    </div>
  );
}

/**
 * The full set, as a grid in the page's details column — below the
 * description, where the owner asked for it, not between the hero and the
 * booking box. Its own lightbox, so a page can place it anywhere without
 * threading state back to the hero.
 */
export function PhotoGrid({ images, alt }: { images: string[]; alt: string }) {
  const { lowData } = usePrefs();
  const [open, setOpen] = useState<number | null>(null);
  const resolved = mediaUrls(images);
  // One photo is the hero already; nothing to add. Low-data mode shows the
  // hero alone, like the gallery.
  if (lowData || resolved.length < 2) return null;
  return (
    <section>
      {/* One word, the same in both languages. */}
      <h2 className="mb-3 text-xl font-bold text-brand-900">Photos</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {resolved.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setOpen(i)}
            className="relative h-40 overflow-hidden rounded-xl"
          >
            <Image
              src={src}
              alt={`${alt} — ${i + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
              className="object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>
      <Lightbox images={resolved} alt={alt} index={open} onChange={setOpen} />
    </section>
  );
}
