import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { enGB, fr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";

// Parsed as local noon: `new Date("2026-08-26")` is UTC midnight, which is the
// previous day for anyone west of Greenwich and silently shifts the booking.
export const parseIso = (v?: string) =>
  v ? new Date(`${v}T12:00:00`) : undefined;
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** dd/mm/yyyy — day first in both languages this site speaks. */
const display = (d?: Date) =>
  d
    ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    : "";

/**
 * Groups the digits as they are typed, and never adds a trailing separator —
 * one that reappears the moment it is deleted makes backspace impossible.
 */
const mask = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
};

/** A typed date, or null. The round-trip is what rejects 31/02. */
const parseTyped = (text: string) => {
  const [d, m, y] = text.split("/").map(Number);
  if (!d || !m || !y || y < 1000) return null;
  const date = new Date(y, m - 1, d, 12);
  return date.getDate() === d && date.getMonth() === m - 1 ? date : null;
};

/**
 * Date entry, everywhere.
 *
 * Two ways in, because a date is two different questions. "Which weekend?"
 * wants a month in view, so there is a calendar. "When were you born?" is a
 * number you already know, and forty taps back through a calendar to reach it
 * is the reason this control was unusable: so the field is a real text input
 * you type dd/mm/yyyy into, and the calendar is the button beside it.
 *
 * Typing is also the accessible route — a caret, a keyboard, no pointer and no
 * grid to arrow through — which a button that only opens a popover never was.
 *
 * The value stays an ISO yyyy-mm-dd string, so nothing downstream changes.
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  locale,
  /** Nothing before this is selectable. Stops a return preceding a departure. */
  min,
  /** Nothing after this is selectable. A date of birth is never in the future. */
  max,
  triggerClassName,
  id,
  "aria-invalid": ariaInvalid
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  locale: string;
  min?: string;
  max?: string;
  triggerClassName?: string;
  id?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [text, setText] = useState(() => display(selected));

  // Whatever set the value elsewhere — a prefill, the calendar, a reset — is
  // what the box shows. Typing only reaches here once it parses, so a half-typed
  // "26/08/19" is never yanked out from under the caret.
  useEffect(() => setText(display(parseIso(value))), [value]);

  // ISO strings compare as strings, which is the whole reason the value is one.
  const inRange = (iso: string) =>
    (!min || iso >= min) && (!max || iso <= max);

  const type = (raw: string) => {
    const next = mask(raw);
    setText(next);
    if (!next) {
      if (value) onChange("");
      return;
    }
    const d = parseTyped(next);
    if (d && inRange(toIso(d))) onChange(toIso(d));
  };

  // An unparseable or out-of-range date is not a value, so the box goes back to
  // the one that is. Silently keeping "31/02/1990" on screen implies it took.
  const settle = () => setText(display(parseIso(value)));

  const start = parseIso(min) ?? new Date(1920, 0);
  const end = parseIso(max) ?? new Date(new Date().getFullYear() + 3, 11);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            // `min-h-11` and a 1.5rem line box are what keep this the same
            // height as the text inputs beside it, and a 44px tap target.
            "flex min-h-11 w-full items-center gap-2 text-base leading-6",
            triggerClassName
          )}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              // The icon is the only pointer affordance left, so it says what it
              // does rather than being decoration you are expected to guess at.
              aria-label={
                locale === "fr" ? "Ouvrir le calendrier" : "Open the calendar"
              }
              className="-m-1 shrink-0 rounded-md p-1 text-ink-500 transition-colors hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <CalendarDays className="size-4" />
            </button>
          </PopoverTrigger>
          <input
            id={id}
            value={text}
            onChange={(e) => type(e.target.value)}
            onBlur={settle}
            // Numeric on a phone, and never the browser's own date control:
            // that is the OS chrome this field exists to replace.
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={ariaInvalid}
            placeholder={placeholder ?? (locale === "fr" ? "jj/mm/aaaa" : "dd/mm/yyyy")}
            className={cn(
              "tnum w-full min-w-0 bg-transparent font-semibold text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-300"
            )}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-auto p-0"
      >
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? (max ? end : undefined)}
          onSelect={(d) => {
            if (!d) return;
            onChange(toIso(d));
            // Close on choose: the month view has done its job and the form is
            // what the visitor came here to finish.
            setOpen(false);
          }}
          disabled={[
            ...(min ? [{ before: parseIso(min)! }] : []),
            ...(max ? [{ after: parseIso(max)! }] : [])
          ]}
          // Month/year dropdowns rather than arrows: a date of birth is forty
          // taps back otherwise, and the bounds keep the year list selectable.
          captionLayout="dropdown"
          startMonth={start}
          endMonth={end}
          /*
           * Without this the grid renders "August 2026" and "Su Mo Tu" under a
           * field that reads "26/08/2026" - two languages inside one control,
           * on a French-first site.
           */
          locale={locale === "fr" ? fr : enGB}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
