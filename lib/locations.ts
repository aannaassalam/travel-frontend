import { useQuery } from "@tanstack/react-query";
import { getLocations, getRoutes, type ServiceLocation } from "./api";
import type { Vertical } from "@/typescript/interface/domain.interface";

/**
 * Serviced places, from the server.
 *
 * Cached for an hour: this changes when the office opens a city, not per page
 * view, and the search box is on every screen. `placeholderData` keeps the last
 * answer on screen while a different vertical loads, so switching tab does not
 * empty the dropdown for a moment.
 */
export function useLocations(vertical?: Vertical) {
  return useQuery({
    queryKey: ["locations", vertical ?? "all"],
    queryFn: () => getLocations(vertical),
    staleTime: 60 * 60 * 1000,
    placeholderData: (previous) => previous
  });
}

/**
 * Destinations reachable from `origin`. Only meaningful for flights and buses,
 * where the product is a pair — a city we fly to is not somewhere we fly to
 * from everywhere.
 */
export function useRoutes(vertical: Vertical, origin?: string) {
  const pair = vertical === "FLIGHT" || vertical === "BUS";
  return useQuery({
    queryKey: ["routes", vertical, origin ?? ""],
    queryFn: () => getRoutes(vertical, origin),
    enabled: pair,
    staleTime: 60 * 60 * 1000,
    placeholderData: (previous) => previous
  });
}

/**
 * Is what the customer typed somewhere we actually go?
 *
 * Compared on the name, an alias or the IATA code, case- and accent-insensitive
 * — people type "kinshasa", "KIN" and "Kinshasa" and mean the same city. An
 * empty box is not "unknown"; it is simply unanswered.
 */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

export function matchLocation(
  typed: string,
  locations: ServiceLocation[] | undefined
): ServiceLocation | null {
  const needle = fold(typed);
  if (!needle || !locations?.length) return null;
  return (
    locations.find(
      (l) => fold(l.name) === needle || (l.iata && fold(l.iata) === needle)
    ) ?? null
  );
}

/** True only when something was typed AND it is not a place we service. */
export function isUnserviced(
  typed: string,
  locations: ServiceLocation[] | undefined
): boolean {
  // While the list is still loading, nothing is "unserviced" — telling someone
  // we do not go to their city because a request is in flight is worse than
  // saying nothing.
  if (!typed.trim() || !locations) return false;
  return !matchLocation(typed, locations);
}
