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
    : (["/img/logo-flexi-h.webp", 640, 180] as const);

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
        className={compact ? "h-10 w-auto" : variant === "full" ? "h-16 w-auto" : "h-11 w-auto"}
        priority
      />
    </Link>
  );
}
