import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/DatePicker";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

/**
 * The form primitive.
 *
 * One floating-label field used by checkout, the lead forms and sign-in, so
 * every input on the site behaves identically: label visible whether the field
 * is empty or full, a real focus ring, inline helper text, and an error state
 * that announces itself rather than only turning red.
 *
 * §11.3: inline validation on blur, in the user's language, with specific
 * messages. §11.5: the focus ring is never removed.
 */

type Base = {
  label: string;
  error?: string;
  helper?: string;
  className?: string;
};

function Shell({
  id,
  label,
  error,
  helper,
  filled,
  className,
  children,
  trailing
}: Base & {
  id: string;
  filled?: boolean;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="field" data-invalid={Boolean(error)} data-filled={filled || undefined}>
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {children}
        {trailing && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-300">
            {trailing}
          </span>
        )}
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-sm font-medium text-bad-600"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      ) : helper ? (
        <p className="mt-2 text-sm text-ink-500">{helper}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  error,
  helper,
  className,
  ...props
}: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = props.id ?? auto;
  // Date and time inputs always render a visible format mask, so
  // `:placeholder-shown` never matches and the label has to be told to float.
  const alwaysFilled = props.type === "date" || props.type === "time";
  return (
    <Shell
      id={id}
      label={label}
      error={error}
      helper={helper}
      className={className}
      filled={alwaysFilled}
    >
      <input
        {...props}
        id={id}
        placeholder={props.placeholder ?? " "}
        aria-invalid={Boolean(error)}
        className="field-input"
      />
    </Shell>
  );
}

/**
 * A password field with a visibility toggle.
 *
 * WCAG 2.2 "Accessible Authentication": a password nobody can see is a memory
 * test with no way to check your work, and it is the reason people pick short
 * ones. The toggle is a real button — labelled, keyboard-reachable, and inside
 * the field's focus ring rather than floating beside it.
 *
 * Paste is deliberately not blocked: a password manager is the single biggest
 * thing a customer can do for their own security, and `onpaste` handlers are
 * the single most common way sites break it.
 */
export function PasswordField({
  label,
  error,
  helper,
  className,
  ...props
}: Base & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const auto = useId();
  const id = props.id ?? auto;
  const [shown, setShown] = useState(false);
  return (
    <Shell id={id} label={label} error={error} helper={helper} className={className}>
      <input
        {...props}
        id={id}
        type={shown ? "text" : "password"}
        placeholder={props.placeholder ?? " "}
        aria-invalid={Boolean(error)}
        className="field-input pr-12"
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-pressed={shown}
        aria-controls={id}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-ink-500 transition-colors hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        {shown ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </Shell>
  );
}

export function TextAreaField({
  label,
  error,
  helper,
  className,
  ...props
}: Base & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const id = props.id ?? auto;
  return (
    <Shell id={id} label={label} error={error} helper={helper} className={className}>
      <textarea
        {...props}
        id={id}
        placeholder={props.placeholder ?? " "}
        aria-invalid={Boolean(error)}
        className="field-input min-h-32 resize-y"
      />
    </Shell>
  );
}

/**
 * A date field: the same floating-label box as every other field, with the
 * project's own calendar in a popover instead of the browser's date control.
 */
export function DateField({
  label,
  error,
  helper,
  className,
  locale,
  value,
  onChange,
  min,
  max,
  placeholder,
  id: idProp
}: Base & {
  locale: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell
      id={id}
      label={label}
      error={error}
      helper={helper}
      className={className}
      // The trigger shows a word, not a mask, so the label only floats once
      // there is a value to caption.
      filled={Boolean(value)}
    >
      <DatePicker
        id={id}
        value={value}
        onChange={onChange}
        locale={locale}
        min={min}
        max={max}
        // No " " stand-in: the picker's own dd/mm/yyyy hint is the point, and
        // the CSS above keeps it out of the label's way until the field has
        // focus.
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        // A caret, not a pointer: the date is typed here, and the calendar is
        // the button inside.
        triggerClassName="field-input cursor-text text-base"
      />
    </Shell>
  );
}

/**
 * A select built on Radix rather than the native control.
 *
 * Same props as before, so every caller is unchanged. The reason for the swap
 * is that a native `<select>` renders its option list with the operating
 * system's own styling, which cannot be themed - so on the one screen where the
 * rest of the form is this design system, the open menu was Chrome's. Radix
 * renders the list as ordinary DOM, which we style like everything else.
 *
 * The trade-off, stated plainly: on a phone, the native control gives the OS
 * picker, which has bigger touch targets than anything rendered in-page. Radix
 * keeps full keyboard support and correct ARIA, but it is a considered loss
 * rather than a free win.
 */
export function SelectField({
  label,
  error,
  helper,
  className,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  placeholder,
  id: idProp
}: Base & {
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  placeholder?: string;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell
      id={id}
      label={label}
      error={error}
      helper={helper}
      className={className}
      // A select always has a value, so its label is always raised.
      filled
    >
      <Select
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(error)}
          /*
            Overrides shadcn's own box so the trigger is the same object as
            every other field: the ring comes from `.field`. The padding and
            height carry `!` because shadcn's `py-2` / `data-[size]:h-9` sit in
            the same cascade layer as `.field-input` and were winning — which is
            what put the value on top of the floating label.
          */
          className="field-input h-auto! w-full cursor-pointer border-0 bg-transparent px-3.5! pt-7! pr-10! pb-2! shadow-none focus-visible:ring-0"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Shell>
  );
}

/** Loading placeholder. Shaped like the content it replaces, never a spinner. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="surface overflow-hidden">
      <Skeleton className="aspect-4/3 rounded-none" />
      <div className="space-y-3 p-6">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-2/5" />
      </div>
    </div>
  );
}
