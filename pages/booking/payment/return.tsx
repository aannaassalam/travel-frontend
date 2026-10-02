import { useRouter } from "next/router";
import { useEffect } from "react";

/**
 * Where the payment provider used to send the customer back to.
 *
 * Online payments are permanently off (cash only), so nobody is sent here any
 * more. The route stays so an old link or bookmark lands somewhere sensible:
 * the booking it was about if the checkout stashed a reference, else home.
 */
export default function PaymentReturnPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    let ref = String(router.query.reference ?? "") || null;
    try {
      ref ??= window.sessionStorage.getItem("pendingOrderRef");
      window.sessionStorage.removeItem("pendingOrderRef");
    } catch {
      /* private mode: nothing stashed */
    }
    router.replace(ref ? `/booking/confirmation/${encodeURIComponent(ref)}` : "/");
  }, [router]);

  return null;
}
