import Image from "next/image";
import Link from "next/link";

/**
 * Site-chrome brand lockup.
 *
 * The supplied artwork is a stacked lockup — mark over wordmark over tagline —
 * which at a 44px header height comes out ~50px wide with an unreadable
 * wordmark. These assets are a horizontal relayout of it, built from the PSD
 * by separating the three bands and setting them side by side. Nothing was
 * redrawn or re-typeset: every pixel is a source pixel, only repositioned.
 *
 * Header drops the tagline (4px tall at this size is dirt, not text); the
 * footer keeps it. Both surfaces sit on dark navy, so both use the knocked-out
 * variant — red kept, everything else white — because the original's grey
 * globe and near-black tagline are invisible against `bg-brand-900`.
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
  const src =
    variant === "full" ? "/img/logo-flexi-h-full.webp" : "/img/logo-flexi-h.webp";

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center"
      aria-label="Flexi Agency — accueil"
    >
      <Image
        src={compact ? "/img/logo-flexi-mark.webp" : src}
        alt="Flexi Agency"
        width={compact ? 263 : 1341}
        height={320}
        className={compact ? "h-10 w-auto" : variant === "full" ? "h-16 w-auto" : "h-11 w-auto"}
        priority
      />
    </Link>
  );
}
