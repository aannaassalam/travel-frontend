import { usePrefs } from "@/lib/prefs";
import { getTransferPlaces, placeText, type PlaceKind, type TransferPlace } from "@/lib/transfers";
import { cn } from "@/lib/utils";
import type { TransferPoint } from "@/typescript/interface/domain.interface";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounced } from "@/lib/useDebounced";
import {
  Hotel,
  Landmark,
  LocateFixed,
  MapPin,
  MapPinned,
  Plane,
  Search,
  Ship,
  TrainFront
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Where the ride starts or ends: one of the office's saved places (airport,
 * hotels, station…), a place found by search, or a point picked on the map.
 *
 * Same combobox shape as search/LocationField, but the list is the server's:
 * it already merges the office's places with external suggestions once three
 * letters are typed, so nothing is matched here. Free text is NOT a value — a
 * ride needs coordinates — so typing clears the chosen point until a
 * suggestion (or the map) sets one again.
 */

const KIND_ICON: Record<PlaceKind, typeof MapPin> = {
  AIRPORT: Plane,
  HOTEL: Hotel,
  STATION: TrainFront,
  PORT: Ship,
  LANDMARK: Landmark,
  OTHER: MapPin
};

export function PlaceField({
  city,
  label,
  value,
  onChange,
  onPickOnMap,
  onLocate
}: {
  city: string;
  label: string;
  value?: TransferPoint;
  onChange: (point: TransferPoint | undefined) => void;
  onPickOnMap: () => void;
  /** Offers "Use my location" at the top of the list (the pick-up's). */
  onLocate?: () => void;
}) {
  const { t, locale } = usePrefs();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // A point set elsewhere — the map — is what the box shows. Only when there is
  // one: typing clears the point, and must not have the box emptied under the
  // caret in return. (A city change remounts the field: see the page's `key`.)
  useEffect(() => {
    if (value) setText(value.label);
  }, [value]);

  const q = useDebounced(text.trim(), 300);
  const { data: places = [], isFetching, isPlaceholderData } = useQuery({
    // Only what is typed is searched; a chosen place's own name is not re-asked.
    queryKey: ["transfer-places", city, value ? "" : q],
    queryFn: ({ signal }) => getTransferPlaces(city, value ? "" : q, { signal }),
    enabled: Boolean(city),
    staleTime: 60_000,
    placeholderData: keepPreviousData
  });

  useEffect(() => setActive(0), [places]);

  const listed = places.length > 0 || isFetching;
  // Typed, searched, nothing: said, with the map offered — with no MapTiler
  // key that is most street addresses.
  const noMatch = !value && q.length >= 3 && !isFetching && !isPlaceholderData && places.length === 0;
  const credited = places.some((p) => p.external);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (p: TransferPlace) => {
    onChange({ label: placeText(p.name, locale), lat: p.lat, lng: p.lng, placeId: p.id });
    setOpen(false);
  };

  return (
    // data-place-field / data-pick-on-map: where the map picker hands focus back (see MapPicker).
    <div ref={box} className="relative" data-place-field>
      <div className="field flex items-center gap-2 pr-2" data-filled={text ? true : undefined}>
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        <input
          id={id}
          className="field-input min-w-0 flex-1"
          value={text}
          // The floating label is the prompt; a blank keeps :placeholder-shown honest.
          placeholder=" "
          role="combobox"
          aria-expanded={open}
          aria-controls={open && listed ? `${id}-list` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && places[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            // Typed text has no coordinates: the point is gone until one is picked.
            if (value) onChange(undefined);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Choosing a place closes the list but leaves the caret here, so a
          // second click (to change the place) fires no focus event.
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") return setOpen(false);
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) return setOpen(true);
              setActive((i) => {
                const next = e.key === "ArrowDown" ? i + 1 : i - 1;
                return (next + places.length) % Math.max(places.length, 1);
              });
            }
            if (e.key === "Enter" && open && places[active]) {
              e.preventDefault();
              choose(places[active]);
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onPickOnMap();
          }}
          title={t("transfer.pickOnMap")}
          data-pick-on-map
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
        >
          <MapPinned className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t("transfer.pickOnMap")}</span>
          <span className="sr-only sm:hidden">{t("transfer.pickOnMap")}</span>
        </button>
      </div>

      {open && (listed || onLocate || noMatch) && (
        <div className="motion-settle absolute left-0 top-[calc(100%+0.5rem)] z-50 max-h-80 w-full overflow-y-auto rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-ink-100 ring-inset">
          {onLocate && (
            // A button, not an option: it opens the map rather than choosing a value.
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                onLocate();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              <LocateFixed className="size-4 shrink-0" aria-hidden="true" />
              {t("transfer.myLocation")}
            </button>
          )}
          {listed && (
            <ul id={`${id}-list`} role="listbox">
              {places.map((p, i) => {
                const Icon = p.external ? Search : KIND_ICON[p.kind ?? "OTHER"] ?? MapPin;
                return (
                  <li
                    key={p.id ?? `${p.lat},${p.lng}`}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    // mousedown, not click: the input blurs first on click and the
                    // list would unmount before the choice registered.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(p);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      i === active ? "bg-brand-50" : "bg-transparent"
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">
                      {placeText(p.name, locale)}
                    </span>
                  </li>
                );
              })}
              {isFetching && !places.length && (
                <li className="px-3 py-2.5 text-sm text-ink-500">{t("common.loading")}…</li>
              )}
            </ul>
          )}
          {noMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                onPickOnMap();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-brand-50"
            >
              <MapPinned className="size-4 shrink-0 text-brand-700" aria-hidden="true" />
              {t("transfer.noMatch")}
            </button>
          )}
          {/* Suggestions from MapTiler, on OpenStreetMap data: credited where they show. */}
          {credited && <p className="px-3 pt-1 pb-0.5 text-[11px] text-ink-500">{t("transfer.namesCredit")}</p>}
        </div>
      )}
    </div>
  );
}
