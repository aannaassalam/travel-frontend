import { price as fmtPrice } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/router";

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
  className
}: {
  sections: FilterSection[];
  priceBounds?: [number, number];
  className?: string;
}) {
  const router = useRouter();
  const { t, currency, locale } = usePrefs();
  const q = router.query as Record<string, string | string[] | undefined>;

  const current = (key: string): string[] => {
    const v = q[key];
    if (!v) return [];
    return Array.isArray(v) ? v : v.split(",").filter(Boolean);
  };

  function apply(next: Record<string, string | undefined>) {
    const merged = { ...q, ...next };
    for (const k of Object.keys(merged)) {
      if (!merged[k]) delete merged[k];
    }
    router.push({ pathname: router.pathname, query: merged as never }, undefined, {
      scroll: false
    });
  }

  function toggle(key: string, value: string, multi: boolean) {
    if (!multi) {
      apply({ [key]: current(key)[0] === value ? undefined : value });
      return;
    }
    const set = new Set(current(key));
    if (set.has(value)) set.delete(value);
    else set.add(value);
    apply({ [key]: set.size ? Array.from(set).join(",") : undefined });
  }

  const activeCount = sections.reduce((n, s) => n + current(s.key).length, 0) +
    (q.maxPrice ? 1 : 0);

  const body = (
    <div className="space-y-6">
      {priceBounds && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-brand-900">
            {t("results.priceRange")}
          </legend>
          <input
            type="range"
            min={priceBounds[0]}
            max={priceBounds[1]}
            step={Math.max(100, Math.round((priceBounds[1] - priceBounds[0]) / 40))}
            value={Number(q.maxPrice ?? priceBounds[1])}
            onChange={(e) => apply({ maxPrice: e.target.value })}
            className="w-full accent-brand-500"
            aria-label={t("results.priceRange")}
          />
          <p className="mt-1 flex justify-between text-xs text-ink-500">
            <span>{fmtPrice(priceBounds[0], currency, locale)}</span>
            <strong className="font-semibold text-ink-700">
              {fmtPrice(Number(q.maxPrice ?? priceBounds[1]), currency, locale)}
            </strong>
          </p>
        </fieldset>
      )}

      {sections.map((section) => (
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
                      name={section.key}
                      checked={checked}
                      onChange={() => toggle(section.key, opt.value, section.type === "checkbox")}
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
          onClick={() =>
            router.push({ pathname: router.pathname }, undefined, { scroll: false })
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
        <div className="border-t border-ink-100/70 p-4">{body}</div>
      </details>

      <aside
        aria-label={t("results.filters")}
        className={`hidden lg:sticky lg:top-32 lg:block lg:h-fit lg:w-64 lg:shrink-0 lg:rounded-lg lg:border lg:border-ink-100 lg:bg-white lg:p-5 ${className ?? ""}`}
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-brand-900">
          <SlidersHorizontal className="size-4" />
          {t("results.filters")}
        </h2>
        {body}
      </aside>
    </>
  );
}
