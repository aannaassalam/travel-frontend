import { Calendar } from "@/components/ui/calendar";
import { enGB, fr } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

/**
 * Date entry for the search box.
 *
 * `<input type="date">` was doing this, and it renders a control the browser
 * owns: a dd/mm/yyyy mask sitting inside a field whose every other value is a
 * word, plus a picker in the OS chrome that shares nothing with this design.
 * Worse for the actual job - choosing a departure is a "which weekend" decision
 * that wants a month in view, not three numeric segments to tab through.
 *
 * The value stays an ISO yyyy-mm-dd string, so nothing downstream changes.
 */
export function DateField({
  value,
  onChange,
  placeholder,
  locale,
  /** Nothing before this is selectable. Used to stop a return preceding a departure. */
  min
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  locale: string;
  min?: string;
}) {
  const [open, setOpen] = useState(false);

  // Parsed as local noon: `new Date("2026-08-26")` is UTC midnight, which is the
  // previous day for anyone west of Greenwich and silently shifts the booking.
  const parse = (v: string) => (v ? new Date(`${v}T12:00:00`) : undefined);
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const selected = parse(value);
  const label = selected
    ? selected.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 text-left text-[15px] font-semibold outline-none",
            selected ? "text-ink-900" : "font-normal text-ink-300"
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-ink-500" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(toIso(d));
            // Close on choose: the month view has done its job and the search
            // box is what the visitor came here to finish.
            setOpen(false);
          }}
          // Yesterday is never a departure date.
          disabled={{ before: min ? parse(min)! : new Date() }}
          /*
           * Without this the grid renders "August 2026" and "Su Mo Tu" under a
           * field that reads "26 août 2026" - two languages inside one control,
           * on a French-first site.
           */
          locale={locale === "fr" ? fr : enGB}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
