import Image from "next/image";
import Link from "next/link";

/**
 * Site-chrome brand lockup.
 *
 * The supplied artwork is a horizontal lockup on an opaque black background.
 * Header and footer both sit on navy, so the black was knocked out to real
 * transparency rather than left as a rectangle: the artwork is premultiplied
 * over black, so alpha comes back from the brightest channel and divides out
 * again, which keeps the glow and the antialiased edges soft instead of
 * leaving the dark halo a threshold produces.
 *
 * The lockup is also re-spaced rather than used as supplied: the mark came in
 * at 2.7x the wordmark's cap height and read as oversized next to the name.
 * It is set at 1.85x here, and centred on the midpoint of cap-height and
 * baseline rather than on the wordmark's bounding box — the descenders of 'g'
 * and 'y' drag that box down and would sit the mark visibly high.
 *
 * One asset serves both surfaces — the artwork has no tagline band to drop, so
 * `variant` now only decides how tall it is drawn. `compact` swaps in the mark
 * alone for narrow viewports, cropped from the same source at the gap between
 * the mark and the wordmark.
 *
 * `alt` carries the brand name so the wordmark being artwork rather than text
 * costs nothing to a screen reader.
 */
export default function Brand({
  variant = "light",
  compact = false
}: {
  variant?: "light" | "dark" | "full";
  compact?: boolean;
}) {
  // Intrinsic sizes of the generated files. next/image needs the true ratio,
  // not a placeholder — a wrong one reserves the wrong space and the header
  // shifts as the image decodes.
  const [src, width, height] = compact
    ? (["/img/logo-flexi-mark.webp", 160, 177] as const)
    : (["/img/logo-flexi-h.webp", 860, 179] as const);

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center"
      aria-label="Flexi Agency — accueil"
    >
      <Image
        src={src}
        alt="Flexi Agency"
        width={width}
        height={height}
        // Heights are set so the WORDMARK renders at the size it always did
        // (16.2px cap in the header). Shrinking the mark shortened the lockup,
        // so holding the old 44px would have scaled the name up to fill the
        // gap the icon left — the text grows and nothing looks smaller. These
        // are the old heights times the lockup's new ratio, 303/445.
        className={
          compact ? "h-10 w-auto" : variant === "full" ? "h-11 w-auto" : "h-[30px] w-auto"
        }
        priority
      />
    </Link>
  );
}
