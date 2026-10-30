import { ResultsView, usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

/**
 * List or grid, beside a results page's sort. The page passes what it shows
 * (a list until the visitor chooses); the choice holds on every results page
 * for the rest of the visit, in this tab only.
 */
export default function ViewToggle({ value }: { value: ResultsView }) {
  const { t, setView } = usePrefs();
  const modes = [
    ["list", List, t("results.viewList")],
    ["grid", LayoutGrid, t("results.viewGrid")]
  ] as const;
  return (
    // Same plate as the sort trigger beside it: white, hairline ring, 44px tall.
    <div
      role="group"
      aria-label={t("results.view")}
      className="inline-flex h-11 shrink-0 items-center gap-0.5 rounded-xl bg-white p-1 shadow-xs ring-1 ring-ink-100 ring-inset"
    >
      {modes.map(([mode, Icon, label]) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          aria-label={label}
          title={label}
          onClick={() => setView(mode)}
          className={cn(
            "flex h-full w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
            value === mode ? "bg-brand-900 text-white" : "text-ink-500 hover:bg-ink-50 hover:text-brand-900"
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
