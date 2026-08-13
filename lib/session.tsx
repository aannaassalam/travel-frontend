import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSession,
  logout as apiLogout,
  requestOtp,
  verifyOtp,
  type CustomerSession
} from "./api";

/**
 * The signed-in customer.
 *
 * The session itself is an httpOnly cookie the browser cannot read, so "am I
 * signed in" is a question only the server can answer — this asks it once and
 * caches the answer. That is the whole reason the token is not in
 * localStorage: a script that can read the token is a script that can steal it
 * (§7.3).
 *
 * `null` means signed out, and is a perfectly ordinary answer rather than an
 * error, so a guest never sees a failure state for simply not having an account.
 */
export function useSession() {
  const { data, isPending } = useQuery<CustomerSession | null>({
    queryKey: ["session"],
    queryFn: getSession,
    // The cookie lasts a week; re-asking on every mount is wasteful and makes
    // the header flicker between signed-out and signed-in on each navigation.
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  return { customer: data ?? null, isPending, signedIn: Boolean(data) };
}

/** Sends the one-time code. Resolves with the dev hint when there is one. */
export function useRequestOtp() {
  return useMutation({ mutationFn: (phone: string) => requestOtp(phone) });
}

/**
 * Verifies the code and opens the session.
 *
 * Everything keyed on identity is invalidated on success — the header, and the
 * bookings list, which switches from "what this device booked" to "everything
 * this phone has ever booked" the moment an account exists.
 */
export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyOtp,
    onSuccess: (customer) => {
      qc.setQueryData(["session"], customer);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    }
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      qc.setQueryData(["session"], null);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    }
  });
}
