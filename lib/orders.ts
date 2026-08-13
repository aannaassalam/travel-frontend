import { useQuery } from "@tanstack/react-query";
import { getMyOrders, getOrder } from "./api";
import { getOrderRefs } from "./store";
import { useSession } from "./session";
import type { Order } from "@/typescript/interface/domain.interface";

/**
 * Reading orders back.
 *
 * The device remembers only which references it booked; the order itself is
 * fetched every time. That is deliberate — an order's status is owned by the
 * office, not the browser. Cash gets marked received, documents get issued, a
 * booking gets cancelled: a cached copy would show the customer a state that
 * stopped being true, and they would act on it.
 */

/** One order. `enabled` guards the first render, before the router has params. */
export function useOrder(reference?: string) {
  return useQuery({
    queryKey: ["order", reference],
    queryFn: () => getOrder(reference!),
    enabled: Boolean(reference),
    // Fresh on every mount: see above.
    staleTime: 0,
    retry: 1
  });
}

/**
 * Every order this device has booked, newest first.
 *
 * Reads the reference list inside `queryFn` rather than at module scope so it
 * is evaluated in the browser — `localStorage` does not exist during SSR, and
 * touching it at render time is a hydration mismatch waiting to happen.
 */
export function useMyOrders() {
  const { signedIn, isPending } = useSession();
  return useQuery<Order[]>({
    queryKey: ["my-orders", signedIn],
    queryFn: async () => {
      // Signed in: the server knows every order for this phone, on any device.
      if (signedIn) return getMyOrders();

      // Guest: only this browser remembers what it booked. Resolve each
      // reference so the DATA is still the server's — just the list is local.
      const refs = getOrderRefs();
      const settled = await Promise.allSettled(refs.map((r) => getOrder(r)));
      // A reference that 404s (purged, or from another environment) is skipped
      // rather than failing the whole list.
      return settled
        .filter((s): s is PromiseFulfilledResult<Order> => s.status === "fulfilled")
        .map((s) => s.value);
    },
    // Wait until we know whether there is a session, or a signed-in customer
    // briefly sees only their guest bookings.
    enabled: !isPending,
    staleTime: 0
  });
}
