import { COUNTRIES, Country, findCountry, splitNational } from "@/lib/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useId } from "react";

/**
 * One height for both halves of the control.
 *
 * The country trigger is a Radix button and the number is an input, so nothing
 * makes their heights agree by accident. Declaring it once, here, is the only
 * version that cannot drift apart again.
 *
 * The trigger needs the `data-[size=default]:` copy as well. shadcn sizes it
 * with that variant, which compiles to an attribute selector and therefore
 * outranks a plain `h-*` utility whatever the class order - so a bare height
 * loses the cascade silently and the trigger stays at h-9.
 */
const CONTROL_H = "h-[3.25rem]";
const TRIGGER_H = `${CONTROL_H} data-[size=default]:${CONTROL_H}`;

/**
 * Phone entry as a country picker plus the national number.
 *
 * Typing a dialling code by hand is the single most error-prone field in a
 * sign-up form: people omit the plus, include the trunk zero, or type their
 * local format and get an SMS that never arrives. Splitting the two makes the
 * country explicit and lets the national part be validated for length before a
 * message is paid for.
 *
 * The select carries the ISO code rather than the dial code, because +1 is both
 * the United States and Canada.
 */
export function PhoneField({
  country,
  national,
  onCountryChange,
  onNationalChange,
  label,
  error,
  helper,
  autoFocus
}: {
  country: Country;
  national: string;
  onCountryChange: (c: Country) => void;
  onNationalChange: (v: string) => void;
  label: string;
  error?: string;
  helper?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <span className="eyebrow mb-2 block text-brand-600">{label}</span>
      <div
        className="flex items-stretch gap-2"
        data-invalid={Boolean(error) || undefined}
      >
        <Select
          value={country.code}
          onValueChange={(v) => onCountryChange(findCountry(v))}
        >
          <SelectTrigger
            id={`${id}-country`}
            aria-label={`${label} - country`}
            className={cn(
              TRIGGER_H,
              "w-32 shrink-0 justify-between rounded-xl border-0 bg-white px-3 text-[15px] font-semibold text-ink-900 shadow-xs ring-1 ring-ink-100 ring-inset focus-visible:ring-2 focus-visible:ring-brand-500"
            )}
          >
            {/* The trigger shows only flag + dial code: it is what the customer
                is choosing, and the full name would not fit beside the number. */}
            <span className="tnum">
              {country.flag} {country.dial}
            </span>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {/* The open list has room for the name, which is what
                    disambiguates the countries sharing a dial code. */}
                <span className="mr-2">{c.flag}</span>
                <span className="tnum mr-2 font-semibold">{c.dial}</span>
                <span className="text-ink-500">{c.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="sr-only" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          value={national}
          // A pasted or autofilled "+243 81 000 00 00" carries its own country:
          // take it, rather than stripping the plus and leaving "243..." to be
          // dialled after whatever the picker happens to say.
          onChange={(e) => {
            const split = splitNational(e.target.value, country);
            if (split.country !== country) onCountryChange(split.country);
            onNationalChange(split.national);
          }}
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          placeholder="81 000 00 00"
          className={cn(
            CONTROL_H,
            "tnum min-w-0 flex-1 rounded-xl bg-white px-4 text-[15px] font-semibold text-ink-900 shadow-xs ring-1 ring-ink-100 outline-none ring-inset placeholder:font-normal placeholder:text-ink-300 focus:ring-2 focus:ring-brand-500 aria-invalid:ring-2 aria-invalid:ring-bad-600"
          )}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-bad-600">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      ) : helper ? (
        <p className="mt-2 text-sm text-ink-500">{helper}</p>
      ) : null}
    </div>
  );
}
