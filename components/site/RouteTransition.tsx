import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * Page transitions.
 *
 * Two parts, both deliberately restrained:
 *  - a top progress bar while the next route loads, so a slow connection has
 *    visible feedback instead of a frozen page;
 *  - a short fade-and-rise on the new content.
 *
 * ponytail: CSS keyframes and two router events, not a transition library.
 * The animation is shortened under `prefers-reduced-motion` (handled globally
 * in globals.css), and the progress bar only appears after 120ms so instant
 * client-side navigations do not flash a bar for one frame.
 */
export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // The path only: a new page fades in and starts afresh, while a filter, a
  // sort, a page number or a #anchor on the same page keeps it as it is —
  // focus, an open filter sheet, a word half typed. Read in render, so the new
  // page mounts once, with its own props (an error event carries no URL).
  const key = router.asPath.split(/[?#]/)[0];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const start = () => {
      // A second start before the first ends (one navigation cancels another)
      // must not leave the first timer to light the bar after both are done.
      clearTimeout(timer);
      timer = setTimeout(() => setLoading(true), 120);
    };
    const done = () => {
      clearTimeout(timer);
      setLoading(false);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);
    return () => {
      clearTimeout(timer);
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
    };
  }, [router.events]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 transition-opacity duration-200 ${
          loading ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="h-full w-full origin-left bg-linear-to-r from-accent-500 via-accent-500 to-brand-400"
          style={{
            animation: loading ? "route-progress 1.6s ease-out forwards" : "none"
          }}
        />
      </div>

      {/* Keyed on the path so the fade replays on every new page. */}
      <div key={key} className="animate-fade-in">
        {children}
      </div>
    </>
  );
}
