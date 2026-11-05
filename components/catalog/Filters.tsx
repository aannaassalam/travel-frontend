import { fromBase, price as fmtPrice } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { pushQuery, queryNow, useQueryNow } from "@/lib/query";
import * as Slider from "@radix-ui/react-slider";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export type FilterSection =
  | {
      /** Must be an allow-listed search param (§8) — nothing else reaches the API. */
      key: string;
      label: string;
      type: "checkbox" | "radio";
      /** `count`: how many are on sale with it, shown beside the label. */
      options: { value: string; label: string; count?: number }[];
      /** Other params that change with this one (a new make drops the models of the old). */
      alsoSet?: (next: string[]) => Record<string, string | undefined>;
    }
  | {
      key: string;
      label: string;
      /** Two handles between `bounds`, or one (an upper limit) without `minKey`. */
      type: "range";
      bounds: [number, number];
      minKey?: string;
      maxKey: string;
      step?: number;
      format?: (n: number) => string;
    };

/** The URL params a section writes. */
const keysOf = (s: FilterSection) =>
  s.type === "range" ? [s.minKey, s.maxKey].filter((k): k is string => Boolean(k)) : [s.key];

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
  const { t, rates, currency, locale } = usePrefs();
  // The address as it will be: a tick shows at once, even on a slow line.
  const q = useQueryNow();

  const list = (v: string | string[] | undefined): string[] =>
    !v ? [] : Array.isArray(v) ? v : v.split(",").filter(Boolean);
  const current = (key: string) => list(q[key]);

  // A narrower search starts again at its first page.
  const apply = (next: Record<string, string | undefined>) => void pushQuery(next);

  function toggle(section: Extract<FilterSection, { options: unknown }>, value: string) {
    // From the address as it will be: a box ticked while the last tick is on
    // its way adds to it.
    const set = new Set(list(queryNow()[section.key]));
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const next = Array.from(set);
    apply({ [section.key]: next.length ? next.join(",") : undefined, ...section.alsoSet?.(next) });
  }
  const pick = (section: Extract<FilterSection, { options: unknown }>, value?: string) =>
    apply({ [section.key]: value, ...section.alsoSet?.(value ? [value] : []) });

  // A range is one filter, whichever end is set; the price range too.
  const activeCount = sections.reduce(
    (n, s) => n + (s.type === "range" ? (keysOf(s).some((k) => q[k]) ? 1 : 0) : current(s.key).length),
    0
  ) + (q.minPrice || q.maxPrice ? 1 : 0);

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
        <RangeSlider
          // New ends start it again (the floor waits for the office's dollar
          // rate); a new URL does not: every key press commits, and a remount
          // would take the focused handle away.
          key={`${low}-${high}`}
          low={low}
          high={high}
          label={priceLabel ?? t("results.priceRange")}
          min={Number(q.minPrice) || low}
          max={Number(q.maxPrice) || high}
          minKey="minPrice"
          maxKey="maxPrice"
          step={Math.max(100, Math.round((high - low) / 40))}
          format={(v) => fmtPrice(fromBase(v, rates), currency, locale)}
          ariaMin={t("results.priceMin")}
          ariaMax={t("results.priceMax")}
          onCommit={apply}
        />
      )}

      {/* A filter with nothing to choose (no makes on sale yet) is not shown. */}
      {sections
        .filter((section) =>
          section.type === "range" ? section.bounds[1] > section.bounds[0] : section.options.length
        )
        .map((section) =>
          section.type === "range" ? (
            <div key={section.key} className="border-t border-ink-100/70 pt-5">
              <RangeSlider
                key={section.bounds.join("-")}
                low={section.bounds[0]}
                high={section.bounds[1]}
                label={section.label}
                min={(section.minKey && Number(q[section.minKey])) || section.bounds[0]}
                max={Number(q[section.maxKey]) || section.bounds[1]}
                minKey={section.minKey}
                maxKey={section.maxKey}
                step={section.step}
                format={section.format ?? String}
                ariaMin={t("results.rangeMin", { label: section.label })}
                ariaMax={t("results.rangeMax", { label: section.label })}
                onCommit={apply}
              />
            </div>
          ) : (
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
                            section.type === "checkbox" ? toggle(section, opt.value) : pick(section, opt.value)
                          }
                          // A radio fires no change when the ticked one is picked
                          // again: that click, or Space (no click from the
                          // keyboard), clears it. Space on release, as the browser
                          // ticks one: held down, it clears once, not off then on.
                          onClick={
                            section.type === "radio" && checked
                              ? () => pick(section)
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
                                  pick(section);
                                }
                              : undefined
                          }
                          className="size-4 shrink-0 accent-brand-500"
                        />
                        {opt.label}
                        {opt.count !== undefined && (
                          <span className="tnum ms-auto text-xs text-ink-500">{opt.count}</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )
        )}

      {activeCount > 0 && (
        <button
          type="button"
          // The filters on this side, not the search itself (place, dates, words).
          onClick={() =>
            apply(
              Object.fromEntries(
                [...sections.flatMap(keysOf), "minPrice", "maxPrice"].map((k) => [k, undefined])
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
 * A range between two handles — the price in francs (`minPrice`/`maxPrice`),
 * a year, an engine size — or one handle, an upper limit (a maximum mileage).
 * Each end is left out of the URL at its end of the range, so "any" has one
 * address. Dragging moves only the handles; the URL — and the one request it
 * makes — changes when a handle is let go, not at every notch.
 */
function RangeSlider({
  low,
  high,
  label,
  min,
  max,
  minKey,
  maxKey,
  step: given,
  format,
  ariaMin,
  ariaMax,
  onCommit
}: {
  low: number;
  high: number;
  label: string;
  min: number;
  max: number;
  /** None: one handle, the upper limit. */
  minKey?: string;
  maxKey: string;
  step?: number;
  format: (v: number) => string;
  ariaMin: string;
  ariaMax: string;
  onCommit: (next: Record<string, string | undefined>) => void;
}) {
  const clamp = (v: number) => Math.min(high, Math.max(low, v));
  const handles = (a: number, b: number) => (minKey ? [clamp(a), clamp(b)] : [clamp(b)]);
  const [value, setValue] = useState(handles(min, max));
  // Drawn twice (phone and desktop): a new URL — the other copy, the back
  // button, "clear" — moves these handles too.
  const [fromUrl, setFromUrl] = useState([min, max]);
  if (fromUrl[0] !== min || fromUrl[1] !== max) {
    setFromUrl([min, max]);
    setValue(handles(min, max));
  }
  const step = given ?? Math.max(1, Math.round((high - low) / 40));
  // The last notch is "any". It is where the slider snaps the top to:
  // the top itself, or a notch short of it when the step does not divide the
  // span — which must not leave the highest out.
  const top = Math.min(high, low + Math.round((high - low) / step) * step);
  const atTop = (v: number) => v >= top;
  const from = minKey ? value[0] : low;
  const to = value[value.length - 1];
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
        onValueCommit={(v) => {
          const next = {
            ...(minKey ? { [minKey]: v[0] > low ? String(v[0]) : undefined } : {}),
            [maxKey]: atTop(v[v.length - 1]) ? undefined : String(v[v.length - 1])
          };
          onCommit(next);
          // Not taken (a move the visitor made is still loading): the handles
          // go back to what the address has — after Radix has set the value of
          // a key press, which it does after this call.
          const now = queryNow();
          if (Object.entries(next).some(([k, x]) => now[k] !== x)) {
            setTimeout(() => setValue(handles(min, max)));
          }
        }}
        className="relative flex h-5 touch-none items-center select-none"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-ink-100">
          <Slider.Range className="absolute h-full rounded-full bg-brand-500" />
        </Slider.Track>
        {minKey && <Slider.Thumb aria-label={ariaMin} aria-valuetext={format(from)} className={thumb} />}
        <Slider.Thumb aria-label={ariaMax} aria-valuetext={format(atTop(to) ? high : to)} className={thumb} />
      </Slider.Root>
      <p className="mt-2 flex justify-between gap-3 text-xs font-semibold text-ink-700">
        <span>{format(from)}</span>
        <span>{format(atTop(to) ? high : to)}</span>
      </p>
    </fieldset>
  );
}
