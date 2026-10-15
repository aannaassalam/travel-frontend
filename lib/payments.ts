import { Currency } from "@/typescript/interface/domain.interface";
import { useQuery } from "@tanstack/react-query";
import { getPaymentOptions } from "./api";

/**
 * Whether paying online can be offered — asked of the server, which holds the
 * one switch for it (and the merchant account behind it).
 *
 *   offered    online payment is on at all: what the footer names
 *   available  …and this order's currency is one it takes (dollars): what a
 *              checkout may offer
 *
 * Both are false until the server has answered, and if it does not: a method
 * the server might refuse is never put in front of a customer.
 */
export function useOnlinePayment(currency?: Currency) {
  const { data } = useQuery({
    queryKey: ["payment-options"],
    queryFn: ({ signal }) => getPaymentOptions({ signal }),
    // Switched rarely, and the server refuses whatever it no longer offers.
    staleTime: 5 * 60_000,
    retry: 1
  });
  const offered = data?.online === true;
  const currencies = offered ? data?.currencies ?? [] : [];
  return {
    offered,
    available: Boolean(currency && currencies.includes(currency)),
    currencies
  };
}
