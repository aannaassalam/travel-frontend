import type { ServiceLocation } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * The place picker for the search box.
 *
 * A `<datalist>` used to do this job. It cannot be styled at all - the browser
 * drew a black system list over a white search panel - and it gives no control
 * over what a match looks like, so an airport code or a province never showed.
 *
 * Deliberately a combobox and NOT a strict select: an unrecognised place is a
 * supported outcome here. The office chose to accept it and route the visitor
 * to an enquiry rather than refuse the search, so free text has to survive
 * being typed. Picking from the list is the fast path, not the only path.
 */
export function LocationField({
  value,
  onChange,
  options,
  placeholder,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  options: ServiceLocation[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const fold = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  /**
   * Matches the name, the IATA code and any alias the office recorded, so
   * "FIH" and "Kin" both find Kinshasa. An empty box lists everything - the
   * serviced list is short enough to browse, and browsing is how someone who
   * does not yet know where they are going uses this.
   */
  const matches = useMemo(() => {
    const needle = fold(value);
    if (!needle) return options.slice(0, 40);
    return options
      .filter((o) =>
        [o.name, o.iata ?? "", o.province ?? "", ...(o.aliases ?? [])].some((f) =>
          fold(String(f)).includes(needle)
        )
      )
      .slice(0, 40);
  }, [value, options]);

  useEffect(() => setActive(0), [value]);

  // Close on an outside click; Escape is handled on the input itself.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (loc: ServiceLocation) => {
    onChange(loc.name);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <input
        className="w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-300"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") return setOpen(false);
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) return setOpen(true);
            setActive((i) => {
              const next = e.key === "ArrowDown" ? i + 1 : i - 1;
              return (next + matches.length) % Math.max(matches.length, 1);
            });
          }
          // Enter picks the highlighted place, but only while the list is open.
          // Closed, it submits the search - which is what someone who typed an
          // unserviced place expects to happen.
          if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            choose(matches[active]);
          }
        }}
      />

      {open && matches.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="motion-settle absolute left-0 top-[calc(100%+0.75rem)] z-50 max-h-72 w-[min(20rem,80vw)] overflow-y-auto rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-ink-100 ring-inset"
        >
          {matches.map((o, i) => (
            <li
              key={o.slug}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input blurs first on click and the
              // list would unmount before the choice registered.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                i === active ? "bg-brand-50" : "bg-transparent"
              )}
            >
              <MapPin className="size-4 shrink-0 text-ink-300" />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">
                {o.name}
              </span>
              {/* The code is what appears on a ticket, so it earns its place. */}
              {o.iata && (
                <span className="tnum shrink-0 text-xs font-semibold text-ink-300">
                  {o.iata}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
