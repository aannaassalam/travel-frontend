import { cn } from "@/lib/utils";
import { AlertCircle, ChevronDown } from "lucide-react";
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

export function SelectField({
  label,
  error,
  helper,
  className,
  options,
  ...props
}: Base &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
  }) {
  const auto = useId();
  const id = props.id ?? auto;
  return (
    <Shell
      id={id}
      label={label}
      error={error}
      helper={helper}
      className={className}
      // A select always has a value, so its label is always in the raised state.
      filled
      trailing={<ChevronDown className="size-4" />}
    >
      <select
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        className="field-input cursor-pointer appearance-none pr-10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
