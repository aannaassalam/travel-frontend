import Layout from "@/components/site/Layout";
import { ErrorSpot } from "@/components/art/spots";
import { getPaymentStatus } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Where MaxiCash sends the customer back to.
 *
 * This screen proves nothing by existing. Landing on it means the payment page
 * finished, not that money moved — anyone can type this URL — so it asks the
 * server, which asks MaxiCash, and believes only that. The same endpoint is the
 * safety net for a webhook that never arrives, which happens often enough that
 * a checkout relying on the webhook alone will strand real customers.
 *
 * Mobile money is push-and-wait: the customer approves on their handset
 * seconds after the browser comes back, so this polls rather than deciding on
 * the first answer.
 */

/** Backs off 1s → 2s → 3s… and gives up at roughly two minutes. */
const MAX_ATTEMPTS = 20;
const delayFor = (attempt: number) => Math.min(1000 + attempt * 500, 5000);

type Phase = "checking" | "paid" | "unresolved" | "missing";

export default function PaymentReturnPage() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [reference, setReference] = useState<string | null>(null);
  /** Guards against React 18 running the effect twice in development. */
  const started = useRef(false);

  const poll = useCallback(
    async (ref: string) => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
          const { paid } = await getPaymentStatus(ref);
          if (paid) {
            setPhase("paid");
            router.replace(`/booking/confirmation/${ref}`);
            return;
          }
        } catch {
          /* transient: keep polling, the deadline below ends it */
        }
        await new Promise((r) => setTimeout(r, delayFor(attempt)));
      }
      /**
       * Not "failed" — unresolved. A mobile-money push can still land after we
       * stop watching, so the copy must not tell someone their money is safe
       * when it may yet arrive, nor that it failed when it may yet succeed.
       */
      setPhase("unresolved");
    },
    [router]
  );

  useEffect(() => {
    if (!router.isReady || started.current) return;
    started.current = true;

    // The return URL is fixed when the payment is opened, so MaxiCash gives it
    // back without our reference; the checkout stashed it before leaving.
    let ref = String(router.query.reference ?? "") || null;
    if (!ref) {
      try {
        ref = window.sessionStorage.getItem("pendingOrderRef");
      } catch {
        ref = null;
      }
    }
    if (!ref) {
      setPhase("missing");
      return;
    }
    setReference(ref);
    try {
      window.sessionStorage.removeItem("pendingOrderRef");
    } catch {
      /* nothing to clean up */
    }
    void poll(ref);
  }, [router.isReady, router.query.reference, poll]);

  const title =
    phase === "checking"
      ? locale === "fr"
        ? "Vérification du paiement…"
        : "Checking your payment…"
      : phase === "paid"
        ? t("confirm.title")
        : locale === "fr"
          ? "Paiement en attente"
          : "Payment pending";

  return (
    <Layout title={title} description="" noindex>
      <div className="container-site flex min-h-[60vh] items-center justify-center py-12">
        <div className="w-full max-w-md surface p-8 text-center">
          {phase === "checking" || phase === "paid" ? (
            <>
              <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-500" />
              <h1 className="text-xl font-bold text-brand-900">{title}</h1>
              <p className="mt-2 text-[15px] text-ink-700">
                {locale === "fr"
                  ? "Nous confirmons le paiement auprès de l'opérateur. Ne fermez pas cette page."
                  : "We are confirming the payment with the operator. Please keep this page open."}
              </p>
              {reference && (
                <p className="mt-4 font-mono text-sm font-bold tracking-wider text-ink-500">
                  {reference}
                </p>
              )}
            </>
          ) : (
            <>
              <ErrorSpot className="mx-auto mb-2 w-full max-w-[180px] text-brand-900" />
              <h1 className="text-xl font-bold text-brand-900">{title}</h1>
              <p className="mt-2 text-[15px] text-ink-700">
                {phase === "missing"
                  ? locale === "fr"
                    ? "Nous n'avons pas retrouvé la réservation liée à ce paiement. Votre référence se trouve dans le SMS de confirmation."
                    : "We could not tell which booking this payment belongs to. Your reference is in the confirmation SMS."
                  : locale === "fr"
                    ? "Le paiement n'est pas encore confirmé. Si vous avez validé sur votre téléphone, il peut arriver d'ici quelques minutes — nous vous envoyons un SMS dès qu'il est reçu."
                    : "The payment is not confirmed yet. If you approved it on your phone it can still arrive in a few minutes — we will text you as soon as it does."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {reference && (
                  <Link
                    href={`/booking/confirmation/${reference}`}
                    className="btn btn-md btn-primary"
                  >
                    {t("confirm.viewBooking")}
                  </Link>
                )}
                <Link href="/account/bookings" className="btn btn-md btn-outline">
                  {t("nav.account")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
