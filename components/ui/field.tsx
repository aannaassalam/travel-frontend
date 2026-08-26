import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useId } from "react";

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
          // Overrides shadcn's own border/height so the trigger is the same
          // object as every other field: the ring comes from `.field`.
          className="field-input h-auto w-full cursor-pointer border-0 bg-transparent pr-10 shadow-none focus-visible:ring-0"
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
