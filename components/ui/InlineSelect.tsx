import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * A compact select for places that are not a labelled form field: the header's
 * currency and language, a results sort, a quantity beside a price.
 *
 * `SelectField` is the labelled form version; this is the bare control. Both
 * are Radix rather than a native `<select>` so the open list is our own DOM and
 * can be styled - a native option list is drawn by the operating system and
 * ignores the design system entirely.
 *
 * `tone="dark"` is for the navy chrome, where the trigger has to read as white
 * text on a translucent plate. The menu itself stays light in both tones,
 * because it floats over page content rather than over the header.
 */
export function InlineSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  tone = "light",
  className,
  triggerClassName,
  id
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Required: the trigger shows only the value, so it needs a name. */
  ariaLabel: string;
  tone?: "light" | "dark";
  className?: string;
  triggerClassName?: string;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "h-auto data-[size=default]:h-auto w-auto cursor-pointer gap-1.5 border-0 text-sm font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-offset-0",
          tone === "dark"
            ? "bg-transparent px-2 py-1.5 text-white hover:bg-white/10 focus-visible:ring-white/40 [&_svg]:opacity-70"
            // Same 44px floor as the text inputs and the date button: a select
            // that renders 6px shorter than the field next to it reads as a
            // different, lesser control.
            : "min-h-11 rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-ink-100 ring-inset hover:bg-ink-50 focus-visible:ring-brand-500",
          className,
          triggerClassName
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
