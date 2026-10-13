import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Play } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

/**
 * The optional video on a detail page: one file per item, uploaded in the
 * admin panel.
 *
 * A clip is tens of megabytes, and nobody on a 3G connection should pay for
 * one by opening a page. So the page carries a cover and a play button, and
 * the player — the browser's own — only exists once that button is pressed.
 *
 * The cover is the item's first photo through next/image: resized for the box
 * and fetched only as it nears the screen. A <video poster> could not do
 * either — it is the original file, several megabytes as uploaded, requested
 * the moment the page opens — which would have cost more than the video saved.
 *
 * Renders nothing without a video: a page with none is the page it was.
 *
 * ponytail: one file, in the quality and format it was uploaded in. There is
 * no lighter version for a slow connection, and a clip in a format a phone
 * cannot decode will not play there — the page says so (MP4 plays everywhere).
 * The way up is a transcoding step behind the admin's upload — nothing on this
 * page changes.
 */

/**
 * Called by React once, when the player replaces the button just pressed —
 * kept out here for that reason: written inline it would run on every render.
 *
 *  - Hands it the keyboard; otherwise focus is left on a control that no
 *    longer exists.
 *  - Starts it. The `autoPlay` attribute alone waits until the browser expects
 *    no stalls: on a line slower than the clip that is a still frame under a
 *    play arrow for half a minute, with the first seconds long since arrived.
 *    Asked here, still inside the press, it plays what it has.
 *  - Keeps the pointer off it for its first half-second. The second press of
 *    a double-click (or a double tap) lands on the player that has just taken
 *    the button's place — pausing the clip the first press started, or in
 *    Chrome sending it full screen.
 *  - And when the player goes — the visitor moved on, or the clip turned out
 *    not to play here — lets go of the file. Taking a <video> off the page does
 *    not stop its download: megabytes more would arrive for nothing.
 */
const startPlayer = (el: HTMLVideoElement | null) => {
  if (!el) return;
  el.focus();
  // Refused or interrupted is not an error to report: `onError` below speaks
  // for a clip that cannot play, and `autoPlay` is still there to start it.
  el.play().catch(() => undefined);
  el.style.pointerEvents = "none";
  const awake = setTimeout(() => {
    el.style.pointerEvents = "";
  }, 500);
  return () => {
    clearTimeout(awake);
    // Only once it is really off the page: in development React rehearses
    // this while the player is still there, and would not put `src` back.
    queueMicrotask(() => {
      if (el.isConnected) return;
      el.removeAttribute("src");
      el.load();
    });
  };
};

export default function ListingVideo({
  url,
  poster,
  title
}: {
  url?: string;
  /** The item's first photo, as stored. */
  poster?: string;
  title: string;
}) {
  const { t, lowData } = usePrefs();
  /**
   * WHICH video was asked for, not merely whether one was. Going from one
   * item's page to the next hands this same component the next address, and a
   * plain flag would start that item's video without anyone pressing play.
   */
  const [playing, setPlaying] = useState<string | null>(null);
  // Which video would not play, for the same reason.
  const [failed, setFailed] = useState<string | null>(null);
  // The playing clip's own shape (width over height), once it has said.
  const [shape, setShape] = useState<{ of: string; ratio: number } | null>(
    null
  );
  // Where the page stood when play was pressed.
  const pressedAt = useRef(0);
  if (!url) return null;
  const ratio = playing === url && shape?.of === url ? shape.ratio : null;

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-brand-900">
        {t("listing.video")}
      </h2>
      {/* Capped rather than left to fill the column: on a page with no side
          rail a full-width 16:9 box would fill the whole screen. */}
      <div
        className="relative aspect-video max-w-2xl overflow-hidden rounded-xl2 bg-brand-900"
        // A clip filmed with the phone upright, fitted into a 16:9 box, is a
        // strip a third of its width. So once the clip says what shape it is
        // the box takes that shape — as wide as before at most (42rem), and
        // never taller than most of the screen.
        style={
          ratio
            ? {
                aspectRatio: String(ratio),
                maxWidth: `min(42rem, calc(70vh * ${ratio}))`
              }
            : undefined
        }
      >
        {failed === url ? (
          <div
            role="alert"
            className="absolute inset-0 grid place-content-center justify-items-center gap-3 p-6 text-center text-sm text-white"
          >
            <p>{t("listing.videoFailed")}</p>
            {/* Back to the cover: one request lost to a bad moment on the
                line must not be the end of it until the page is reloaded. */}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setFailed(null);
                setPlaying(null);
              }}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : playing === url ? (
          <video
            ref={startPlayer}
            controls
            // Asked for by a press of the button, so it may start with sound.
            autoPlay
            playsInline
            src={mediaUrl(url)}
            aria-label={title}
            className="absolute inset-0 size-full"
            // Said in words: left alone, a clip this device cannot decode (or
            // one that never arrives) is a black box with dead controls. Sound
            // with no picture is the same failure — the picture is the part
            // that was not understood.
            onError={() => setFailed(url)}
            onLoadedMetadata={(e) => {
              const { videoWidth, videoHeight } = e.currentTarget;
              if (!videoWidth || !videoHeight) return setFailed(url);
              // Taking the clip's shape moves everything below the player.
              // Fine while the visitor is still looking at it — not once they
              // have scrolled on to read while a slow clip was still arriving:
              // the line under their thumb would jump away (a press meant for
              // "Add" landed on a photo). Then the box stays as it is.
              if (Math.abs(window.scrollY - pressedAt.current) < 8) {
                setShape({ of: url, ratio: videoWidth / videoHeight });
              }
            }}
          />
        ) : (
          <>
            {/* Low-data mode keeps the button and drops the picture. */}
            {poster && !lowData && (
              <Image
                src={mediaUrl(poster)}
                alt=""
                fill
                sizes="(max-width: 720px) 100vw, 672px"
                className="object-cover"
              />
            )}
            {/* The button is the whole cover, not just the disc on it. */}
            <button
              type="button"
              onClick={() => {
                pressedAt.current = window.scrollY;
                setPlaying(url);
              }}
              aria-label={t("listing.playVideo", { title })}
              // The site's focus ring sits outside a control, where this box
              // clips it away; drawn inside the cover instead.
              className="group absolute inset-0 grid size-full place-items-center rounded-xl2 focus-visible:-outline-offset-4"
            >
              <span className="grid size-16 place-items-center rounded-full bg-white text-brand-900 shadow-md transition-transform group-hover:scale-105">
                <Play className="size-7 fill-current" />
              </span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
