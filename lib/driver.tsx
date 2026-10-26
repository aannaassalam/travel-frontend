import type {
  Localized,
  Money,
  RideStatus,
  TransferMode,
  TransferPoint
} from "@/typescript/interface/domain.interface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, ApiError, get, post } from "./api";

/**
 * The driver portal's side of the API (`/api/v1/driver`).
 *
 * Same shape as lib/session.tsx for the customer: the session is an httpOnly
 * cookie (`drv_session`) the browser cannot read, so "am I signed in" is
 * answered by the server once and cached. The write calls are plain functions
 * rather than useMutation — the global mutation handler toasts an English
 * message on any error, and a driver's screen is French first.
 */

export interface DriverVehicle {
  make?: string;
  model?: string;
  color?: string;
  plate?: string;
  /** "Toyota Corolla · KN 1234" as the server words it. */
  label?: string;
}

/** Mirrors the backend's presentMe (driverController). */
export interface DriverSession {
  id?: string;
  name: string;
  phone?: string;
  city?: string;
  photo?: string;
  vehicle?: DriverVehicle | null;
  ratingStats?: { rating?: number; count?: number };
  /** Today's and upcoming rides, when the server counts them. */
  counts?: { today?: number; upcoming?: number };
}

/**
 * A ride as its driver sees it (presentDriverRide): the customer's name and
 * number, never their id or e-mail; the price to collect, never the cost.
 */
export interface DriverRide {
  id?: string;
  reference: string;
  status: RideStatus;
  mode: TransferMode;
  city?: string;
  pickup: TransferPoint;
  dropoff?: TransferPoint;
  at: string;
  hours?: number;
  passengers: number;
  distanceKm?: number;
  durationMinutes?: number;
  routeSource?: "ROUTING" | "ESTIMATE";
  route?: [number, number][];
  category?: Localized | string;
  customer: { name?: string; phone?: string };
  /** What the customer pays — needed for cash collection. */
  price?: Money;
  /** The order's: cash still owed while not `paid`. */
  payment?: { method?: string; status?: string; paid: boolean };
  notes?: string;
  startedAt?: string;
  endedAt?: string;
  alertsCount?: number;
  /** The server's alert window: ASSIGNED to two hours after the end. */
  canAlert?: boolean;
  timeline?: { at: string; event: string; actor?: string; detail?: string }[];
}

export type RideScope = "today" | "upcoming" | "done";

/** POST /driver/login — phone + password, as the office set it. */
export const driverLogin = (input: { phone: string; password: string }) =>
  post<{ driver: DriverSession }>("/driver/login", input).then((r) => r.driver);

export const driverLogout = () => post<unknown>("/driver/logout", {});

/** GET /driver/me — null when there is no session, which is not an error. */
export async function getDriverSession(): Promise<DriverSession | null> {
  try {
    return (await get<{ driver: DriverSession }>("/driver/me")).driver;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** PATCH /driver/me/password */
export async function changeDriverPassword(body: { current: string; next: string }) {
  const res = await fetch(`${API_BASE}/driver/me/password`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.message ?? "Could not save", res.status, data?.code);
}

/** GET /driver/rides?scope= */
export const getDriverRides = (scope: RideScope) =>
  get<{ items: DriverRide[] }>(`/driver/rides?scope=${scope}`).then((r) => r.items ?? []);

export const getDriverRide = (reference: string) =>
  get<{ ride: DriverRide }>(`/driver/rides/${encodeURIComponent(reference)}`).then((r) => r.ride);

/** ASSIGNED → STARTED, or STARTED → COMPLETED; the server stamps the time. */
export const startDriverRide = (reference: string) =>
  post<{ ride: DriverRide }>(`/driver/rides/${encodeURIComponent(reference)}/start`, {});
export const endDriverRide = (reference: string) =>
  post<{ ride: DriverRide }>(`/driver/rides/${encodeURIComponent(reference)}/end`, {});
/** The office's alert number comes back, so the screen can offer the call. */
export const alertDriverRide = (
  reference: string,
  body: { lat?: number; lng?: number; note?: string }
) =>
  post<{ sent: boolean; officePhone?: string }>(
    `/driver/rides/${encodeURIComponent(reference)}/alert`,
    body
  );

/* ------------------------------------------------------------------- hooks */

export const DRIVER_KEY = ["driver"];

/** The signed-in driver. `null` is simply "signed out". */
export function useDriver() {
  const { data, isPending } = useQuery<DriverSession | null>({
    queryKey: DRIVER_KEY,
    queryFn: getDriverSession,
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  return { driver: data ?? null, isPending, signedIn: Boolean(data) };
}

const RIDES_CACHE = (scope: RideScope) => `drv.rides.${scope}`;

/**
 * The driver's rides, kept offline-ish: the last list this browser loaded is
 * saved per tab and shown again when the request fails, with the time it was
 * loaded — a driver in a car park with one bar of signal still needs the
 * address. `cachedAt` is set only on that fallback.
 */
export function useDriverRides(scope: RideScope, enabled = true) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["driver-rides", scope],
    enabled,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async (): Promise<{ items: DriverRide[]; cachedAt?: string }> => {
      try {
        const items = await getDriverRides(scope);
        try {
          sessionStorage.setItem(
            RIDES_CACHE(scope),
            JSON.stringify({ items, at: new Date().toISOString() })
          );
        } catch {
          /* ignore */
        }
        return { items };
      } catch (err) {
        // Signed out is not "offline": the cached session is dropped, and the
        // layout sends them to the login.
        if (err instanceof ApiError && err.status === 401) {
          qc.setQueryData(DRIVER_KEY, null);
          throw err;
        }
        try {
          const saved = JSON.parse(sessionStorage.getItem(RIDES_CACHE(scope)) || "null");
          if (saved?.items) return { items: saved.items, cachedAt: saved.at };
        } catch {
          /* ignore */
        }
        throw err;
      }
    }
  });
}

/** One ride, fresh on every visit: its status is the office's and the customer's, not this browser's. */
export function useDriverRide(reference?: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["driver-ride", reference],
    queryFn: async () => {
      try {
        return await getDriverRide(reference!);
      } catch (err) {
        // Signed out meanwhile (a password reset by the office, a logout on
        // another tab): the layout sends them to the login, not to "not found".
        if (err instanceof ApiError && err.status === 401) qc.setQueryData(DRIVER_KEY, null);
        throw err;
      }
    },
    enabled: Boolean(reference),
    staleTime: 0,
    refetchOnMount: true,
    retry: 1
  });
}
