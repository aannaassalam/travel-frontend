import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePrefs } from "@/lib/prefs";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

/**
 * Full-screen viewer for a Gallery: one photo at a time, at its own aspect
 * ratio, on black. Built on the site's Dialog so focus trapping, Escape, the
 * body scroll lock and returning focus to whatever opened it are the ones
 * every other overlay uses — this file only adds the arrows.
 *
 * Controlled by the caller: `index` null is closed, a number is open on that
 * photo. Keeping the position outside means there is nothing to resync when
 * it is opened again on a different image.
 */
export default function Lightbox({
  images,
  alt,
  index,
  onChange
}: {
  images: string[];
  alt: string;
  index: number | null;
  onChange: (index: number | null) => void;
}) {
  const { locale } = usePrefs();
  const touchX = useRef<number | null>(null);
  const n = images.length;
  // During the close animation `index` is already null; keeping the last one
  // stops the viewer snapping to the first photo for the fade.
  const last = useRef(0);
  if (index !== null) last.current = index;
  const current = index ?? last.current;
  const step = (d: number) => onChange((current + d + n) % n);

  return (
    <Dialog open={index !== null} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent
        // The dialog's own close control is a 16px icon at 70% opacity, made
        // for a white card; on black over a photograph it vanished. The
        // viewer draws its own, the size of the arrows.
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 bg-black p-0 text-white shadow-none sm:max-w-none"
        // The title names the dialog; there is no prose to describe it, and
        // Radix warns on every open unless the absence is stated explicitly.
        aria-describedby={undefined}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") step(-1);
          if (e.key === "ArrowRight") step(1);
        }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        }}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="flex items-center justify-between p-3">
          <p className="tnum px-1 text-sm font-semibold" aria-live="polite">
            {current + 1} / {n}
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={locale === "fr" ? "Fermer" : "Close"}
            className="grid size-11 place-items-center rounded-full bg-white/20 ring-1 ring-white/40 hover:bg-white/35"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="relative flex-1">
          <Image
            src={images[current]}
            alt={`${alt} — ${current + 1}`}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
          {n > 1 && (
            // The next photo, fetched now so the arrow never lands on a
            // blank frame. Hidden, so it must be eager: a lazy image that is
            // not on screen is never requested.
            <Image
              src={images[(current + 1) % n]}
              alt=""
              fill
              sizes="100vw"
              className="hidden"
              loading="eager"
            />
          )}
        </div>

        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={
                locale === "fr" ? "Photo précédente" : "Previous photo"
              }
              className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 ring-1 ring-white/40 hover:bg-white/35"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={locale === "fr" ? "Photo suivante" : "Next photo"}
              className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 ring-1 ring-white/40 hover:bg-white/35"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
