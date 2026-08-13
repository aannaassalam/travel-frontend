import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Horizontal rail with its own heading row.
 *
 * The heading is part of this component rather than a separate `SectionHeading`
 * above it, because the scroll arrows belong in the same flex row as the
 * "view all" link. Two earlier attempts positioned the arrows absolutely —
 * first above the rail, where they covered the link, then on the rail itself,
 * where they sat on top of the cards. Laying them out instead of overlaying
 * them removes the whole class of collision.
 *
 * There is deliberately no edge fade. A gradient overlay only blends on the one
 * background colour it was written for, and a `mask-image` fades the cards' own
 * text, which looks like a rendering fault rather than an affordance. The rail
 * simply clips at the container edge — the half-visible next card is the
 * affordance, which is what Booking and Airbnb both rely on.
 *
 * ponytail: CSS scroll-snap and `scrollBy`, not a carousel library. Embla is
 * already in package.json and would work, but this is ~60 lines, ships no extra
 * JavaScript, and keeps native touch scrolling — better than any JS emulation
 * of it on a phone.
 */
export default function Carousel({
  children,
  className,
  itemClassName = "w-[280px] sm:w-[320px]",
  label,
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  href,
  cta,
  tone = "light"
}: {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  /** Accessible name for the scrollable region. */
  label: string;
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  href?: string;
  cta?: string;
  tone?: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const { locale } = usePrefs();

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // The rail rests at scrollLeft === paddingLeft, not 0: scroll-snap parks the
    // first card against the snapport edge, which excludes the container's own
    // padding. Comparing against 0 left the "back" arrow permanently enabled.
    const padLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    setAtStart(el.scrollLeft <= padLeft + 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const scroll = (direction: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    // A bit less than a full viewport, so the next card peeks in and the rail
    // never looks like it has ended.
    el.scrollBy({ left: direction * el.clientWidth * 0.82, behavior: "smooth" });
  };

  const dark = tone === "dark";
  const scrollable = !(atStart && atEnd);

  const arrow = cn(
    "inline-flex size-10 items-center justify-center rounded-full transition-all",
    "disabled:cursor-default disabled:opacity-35 disabled:shadow-none",
    dark
      ? "bg-white/10 text-white ring-1 ring-white/20 ring-inset hover:not-disabled:bg-white/20"
      : "bg-white text-brand-900 shadow-sm ring-1 ring-ink-100 ring-inset hover:not-disabled:shadow-md hover:not-disabled:ring-brand-400",
    "hover:not-disabled:scale-105 active:not-disabled:scale-95"
  );

  return (
    <div className={className}>
      {(title || cta) && (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="max-w-2xl">
            {eyebrow && (
              <p
                className={cn(
                  "eyebrow mb-2 flex items-center gap-2",
                  dark ? "text-accent-500" : "text-brand-500"
                )}
              >
                {eyebrowIcon ?? (
                  <span className="h-px w-6 bg-accent-500" aria-hidden="true" />
                )}
                {eyebrow}
              </p>
            )}
            {title && (
              <h2
                className={cn(
                  "display text-[26px] leading-[1.15] sm:text-[34px]",
                  dark ? "text-white" : "text-brand-900"
                )}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={cn(
                  "mt-2 text-[15px] leading-relaxed",
                  dark ? "text-white/70" : "text-ink-500"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* CTA and arrows share one row, so neither can ever cover the other. */}
          <div className="flex items-center gap-4">
            {href && cta && (
              <Link
                href={href}
                className={cn(
                  "group inline-flex items-center gap-1.5 text-sm font-semibold transition-colors",
                  dark ? "text-white/85 hover:text-white" : "text-brand-600 hover:text-brand-900"
                )}
              >
                {cta}
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
            {scrollable && (
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => scroll(-1)}
                  disabled={atStart}
                  className={arrow}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => scroll(1)}
                  disabled={atEnd}
                  className={arrow}
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* `-mx-4 px-4` lets cards run to the container edge while keeping the
          first one aligned with the heading above it. */}
      <div
        ref={ref}
        role="group"
        aria-label={label}
        tabIndex={0}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 py-2"
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div key={i} className={cn("shrink-0 snap-start", itemClassName)}>
                {child}
              </div>
            ))
          : children}
      </div>

      <p className="sr-only">
        {locale === "fr"
          ? "Utilisez les flèches du clavier pour faire défiler."
          : "Use the arrow keys to scroll."}
      </p>
    </div>
  );
}
