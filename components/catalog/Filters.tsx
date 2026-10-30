import { fromBase, price as fmtPrice } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { pushQuery, queryNow, useQueryNow } from "@/lib/query";
import * as Slider from "@radix-ui/react-slider";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export interface FilterSection {
  /** Must be an allow-listed search param (§8) — nothing else reaches the API. */
  key: string;
  label: string;
  type: "checkbox" | "radio";
  options: { value: string; label: string }[];
}

/**
 * §11.2: sidebar on desktop, disclosure on mobile. State lives in the URL so a
 * filtered result set is shareable and the back button behaves.
 */
export default function Filters({
  sections,
  priceBounds,
  priceLabel,
  className
}: {
  sections: FilterSection[];
  priceBounds?: [number, number];
  /** What the price is for: per night, per 24 hours… */
  priceLabel?: string;
  className?: string;
}) {
  const { t, rates } = usePrefs();
  // The address as it will be: a tick shows at once, even on a slow line.
  const q = useQueryNow();

  const list = (v: string | string[] | undefined): string[] =>
    !v ? [] : Array.isArray(v) ? v : v.split(",").filter(Boolean);
  const current = (key: string) => list(q[key]);

  // A narrower search starts again at its first page.
  const apply = (next: Record<string, string | undefined>) => void pushQuery(next);

  function toggle(key: string, value: string) {
    // From the address as it will be: a box ticked while the last tick is on
    // its way adds to it.
    const set = new Set(list(queryNow()[key]));
    if (set.has(value)) set.delete(value);
    else set.add(value);
    apply({ [key]: set.size ? Array.from(set).join(",") : undefined });
  }

  // The price range is one filter, whichever end is set.
  const activeCount = sections.reduce((n, s) => n + current(s.key).length, 0) +
    (q.minPrice || q.maxPrice ? 1 : 0);

  // From 5 $, not from the cheapest listing: with one bus on sale both ends
  // read its fare. Prices are francs, so the floor is 5 $ at the office's rate,
  // up to the franc — not the next 100 FC, which read "5,02 $" (0 without a
  // dollar rate). The top stays the dearest listing, never below the floor.
  const floor = rates?.USD ? Math.ceil(Number((5 * rates.USD).toFixed(6))) : 0;
  const [low, high] = [floor, Math.max(floor, priceBounds?.[1] ?? 0)];

  // Drawn twice, the phone sheet and the desktop aside: each copy names its
  // radios apart, or the two form one group and the hidden copy keeps the tick.
  const body = (copy: string) => (
    <div className="space-y-6">
      {priceBounds && high > low && (
        <PriceRange
          // New ends start it again (the floor waits for the office's dollar
          // rate); a new URL does not: every key press commits, and a remount
          // would take the focused handle away.
          key={`${low}-${high}`}
          low={low}
          high={high}
          label={priceLabel ?? t("results.priceRange")}
          min={Number(q.minPrice) || low}
          max={Number(q.maxPrice) || high}
          onCommit={apply}
        />
      )}

      {/* A filter with nothing to choose (no makes on sale yet) is not shown. */}
      {sections.filter((section) => section.options.length).map((section) => (
        <fieldset key={section.key} className="border-t border-ink-100/70 pt-5">
          <legend className="mb-3 text-sm font-bold text-brand-900">{section.label}</legend>
          <ul className="space-y-2">
            {section.options.map((opt) => {
              const checked = current(section.key).includes(opt.value);
              return (
                <li key={opt.value}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
                    <input
                      type={section.type}
                      name={`${section.key}-${copy}`}
                      checked={checked}
                      onChange={() =>
                        section.type === "checkbox"
                          ? toggle(section.key, opt.value)
                          : apply({ [section.key]: opt.value })
                      }
                      // A radio fires no change when the ticked one is picked
                      // again: that click, or Space (no click from the
                      // keyboard), clears it. Space on release, as the browser
                      // ticks one: held down, it clears once, not off then on.
                      onClick={
                        section.type === "radio" && checked
                          ? () => apply({ [section.key]: undefined })
                          : undefined
                      }
                      onKeyDown={
                        section.type === "radio" && checked
                          ? (e) => e.key === " " && e.preventDefault()
                          : undefined
                      }
                      onKeyUp={
                        section.type === "radio" && checked
                          ? (e) => {
                              if (e.key !== " ") return;
                              e.preventDefault();
                              apply({ [section.key]: undefined });
                            }
                          : undefined
                      }
                      className="size-4 accent-brand-500"
                    />
                    {opt.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}

      {activeCount > 0 && (
        <button
          type="button"
          // The filters on this side, not the search itself (place, dates, words).
          onClick={() =>
            apply(
              Object.fromEntries(
                [...sections.map((s) => s.key), "minPrice", "maxPrice"].map((k) => [k, undefined])
              )
            )
          }
          className="text-sm font-semibold text-brand-500 hover:underline"
        >
          {t("results.clearFilters")}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: a native disclosure. No drawer library, no focus trap to get wrong. */}
      <details className={`surface lg:hidden ${className ?? ""}`}>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold text-brand-900">
          <SlidersHorizontal className="size-4" />
          {t("results.filters")}
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </summary>
        <div className="border-t border-ink-100/70 p-4">{body("m")}</div>
      </details>

      <aside
        aria-label={t("results.filters")}
        className={`hidden lg:sticky lg:top-header lg:block lg:h-fit lg:w-64 lg:shrink-0 lg:rounded-lg lg:border lg:border-ink-100 lg:bg-white lg:p-5 ${className ?? ""}`}
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-brand-900">
          <SlidersHorizontal className="size-4" />
          {t("results.filters")}
        </h2>
        {body("d")}
      </aside>
    </>
  );
}

/**
 * The price, between two handles, in francs: `minPrice` and `maxPrice` in the
 * URL, each left out at its end of the range so "any price" has one address.
 * Dragging moves only the handles; the URL — and the one request it makes —
 * changes when a handle is let go, not at every notch.
 */
function PriceRange({
  low,
  high,
  label,
  min,
  max,
  onCommit
}: {
  low: number;
  high: number;
  label: string;
  min: number;
  max: number;
  onCommit: (next: { minPrice?: string; maxPrice?: string }) => void;
}) {
  const { t, currency, locale, rates } = usePrefs();
  const clamp = (v: number) => Math.min(high, Math.max(low, v));
  const [value, setValue] = useState([clamp(min), clamp(max)]);
  // Drawn twice (phone and desktop): a new URL — the other copy, the back
  // button, "clear" — moves these handles too.
  const [fromUrl, setFromUrl] = useState([min, max]);
  if (fromUrl[0] !== min || fromUrl[1] !== max) {
    setFromUrl([min, max]);
    setValue([clamp(min), clamp(max)]);
  }
  const step = Math.max(100, Math.round((high - low) / 40));
  // The last notch is "any price". It is where the slider snaps the top to:
  // the top itself, or a notch short of it when the step does not divide the
  // span — which must not leave the dearest out.
  const top = Math.min(high, low + Math.round((high - low) / step) * step);
  const atTop = (v: number) => v >= top;
  const shown = (v: number) => fmtPrice(fromBase(v, rates), currency, locale);
  const thumb =
    "block size-5 rounded-full border-2 border-brand-500 bg-white shadow-sm transition-colors hover:border-brand-700";

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-brand-900">{label}</legend>
      <Slider.Root
        min={low}
        max={high}
        step={step}
        value={value}
        onValueChange={setValue}
        onValueCommit={([from, to]) => {
          const next = {
            minPrice: from > low ? String(from) : undefined,
            maxPrice: atTop(to) ? undefined : String(to)
          };
          onCommit(next);
          // Not taken (a move the visitor made is still loading): the handles
          // go back to the prices the address has — after Radix has set the
          // value of a key press, which it does after this call.
          const now = queryNow();
          if (now.minPrice !== next.minPrice || now.maxPrice !== next.maxPrice) {
            setTimeout(() => setValue([clamp(min), clamp(max)]));
          }
        }}
        className="relative flex h-5 touch-none items-center select-none"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-ink-100">
          <Slider.Range className="absolute h-full rounded-full bg-brand-500" />
        </Slider.Track>
        <Slider.Thumb aria-label={t("results.priceMin")} aria-valuetext={shown(value[0])} className={thumb} />
        <Slider.Thumb
          aria-label={t("results.priceMax")}
          aria-valuetext={shown(atTop(value[1]) ? high : value[1])}
          className={thumb}
        />
      </Slider.Root>
      <p className="mt-2 flex justify-between gap-3 text-xs font-semibold text-ink-700">
        <span>{shown(value[0])}</span>
        <span>{shown(atTop(value[1]) ? high : value[1])}</span>
      </p>
    </fieldset>
  );
}
