import { dial } from "@/lib/contact";
import { usePrefs } from "@/lib/prefs";
import { locate } from "@/lib/transfers";
import { cn } from "@/lib/utils";
import { Loader2, PhoneCall, ShieldAlert, Siren } from "lucide-react";
import { useState } from "react";

/**
 * "Alerte sécurité" — the one red button on the site, shared by the customer's
 * ride page and the driver's. One confirmation, then the browser's position if
 * it gives one, then the call to the API. The office's number is shown straight
 * after, whether the alert went through or not: when someone presses this, the
 * next thing they need is a human to call.
 */
export function AlertButton({
  onSend,
  phone,
  confirmText,
  className
}: {
  /** Sends the alert; rejects when the API refused it. May answer with the office's alert number. */
  onSend: (position?: { lat: number; lng: number }) => Promise<{ officePhone?: string } | void>;
  /** The office's number, to call when the server names none. */
  phone?: string;
  confirmText: string;
  className?: string;
}) {
  const { t } = usePrefs();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [officePhone, setOfficePhone] = useState<string>();
  const callNumber = officePhone || phone;

  async function fire() {
    // Native confirm: one tap to go back from, works on every handset, and
    // nothing to style on a screen that may be read in a hurry.
    if (!window.confirm(confirmText)) return;
    setState("sending");
    const position = await locate();
    try {
      const r = await onSend(position);
      // The alert line (Settings) may differ from the switchboard: prefer it.
      setOfficePhone(r?.officePhone || undefined);
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div
        role="status"
        className={cn("rounded-xl bg-bad-100 p-4 ring-1 ring-bad-600/20 ring-inset", className)}
      >
        <p className="flex items-center gap-2 font-bold text-bad-600">
          <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
          {t("ride.alertSent")}
        </p>
        {callNumber && (
          <a
            href={`tel:${dial(callNumber)}`}
            className="btn btn-md btn-dark mt-3 w-full sm:w-auto"
          >
            <PhoneCall className="size-4" aria-hidden="true" />
            {t("ride.alertCall", { phone: callNumber })}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void fire()}
        disabled={state === "sending"}
        aria-busy={state === "sending"}
        className="btn btn-lg w-full bg-bad-600 text-white shadow-sm hover:bg-[#8f261d]"
      >
        {state === "sending" ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <Siren className="size-5" aria-hidden="true" />
        )}
        {state === "sending" ? t("ride.alertSending") : t("ride.alert")}
      </button>
      {state === "failed" && (
        <p role="alert" className="mt-2 text-sm font-semibold text-bad-600">
          {t("ride.alertFailed")}
          {phone && (
            <>
              {" "}
              <a href={`tel:${dial(phone)}`} className="underline">
                {phone}
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
