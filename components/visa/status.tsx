import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { visaDay, type VisaApplication, type VisaStatus } from "@/lib/visa";
import { fmtAt } from "@/lib/transfers";
import { CheckCircle2, Circle, CircleDot, XCircle } from "lucide-react";

/** A flag from the two letters of a country code (regional indicator symbols). */
export const flagOf = (code: string) =>
  /^[A-Z]{2}$/i.test(code)
    ? String.fromCodePoint(
        ...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)
      )
    : "";

const STATUS_TONE: Record<VisaStatus, string> = {
  SUBMITTED: "bg-brand-50 text-brand-700",
  IN_REVIEW: "bg-brand-50 text-brand-700",
  INFO_REQUESTED: "bg-warn-100 text-warn-600",
  LODGED: "bg-brand-50 text-brand-700",
  APPOINTMENT: "bg-brand-50 text-brand-700",
  APPROVED: "bg-ok-100 text-ok-600",
  REFUSED: "bg-bad-100 text-bad-600",
  COMPLETED: "bg-ok-100 text-ok-600",
  CANCELLED: "bg-ink-100 text-ink-700"
};

/** The status and the payment, as two badges: one never stands in for the other. */
export function VisaBadges({
  application
}: {
  application: Pick<VisaApplication, "status" | "paymentStatus">;
}) {
  const { t } = usePrefs();
  const { status, paymentStatus } = application;
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={cn(
          "rounded px-2.5 py-1 text-xs font-bold",
          STATUS_TONE[status]
        )}
      >
        {t(`visa.status.${status}`)}
      </span>
      {status !== "CANCELLED" && (
        <span
          className={cn(
            "rounded px-2.5 py-1 text-xs font-bold",
            paymentStatus === "PAID"
              ? "bg-ok-100 text-ok-600"
              : "bg-warn-100 text-warn-600"
          )}
        >
          {t(paymentStatus === "PAID" ? "visa.pay.PAID" : "visa.pay.UNPAID")}
        </span>
      )}
    </div>
  );
}

type StepState = "done" | "current" | "todo" | "cancelled";

/** Which step is in hand: 0 received … 4 completed; 5 once everything is done. */
const CURRENT: Record<VisaStatus, number> = {
  SUBMITTED: 1,
  IN_REVIEW: 1,
  INFO_REQUESTED: 1,
  LODGED: 3,
  APPOINTMENT: 3,
  APPROVED: 4,
  REFUSED: 4,
  COMPLETED: 5,
  // Only cancellable before it is lodged: the line ends at the review.
  CANCELLED: 1
};

/**
 * Received → review → lodged → decision → completed. Worked out from the
 * status, not from the history: every step reached wears a tick, the one in
 * hand is marked, and a cancellation ends the line where it stopped.
 */
export function VisaProgress({
  application: a
}: {
  application: VisaApplication;
}) {
  const { t, locale } = usePrefs();
  const at = (...events: string[]) =>
    a.timeline?.find((e) => events.includes(e.event))?.at;
  const current = CURRENT[a.status];
  const outcome =
    a.decision?.outcome ??
    (a.status === "APPROVED" || a.status === "REFUSED" ? a.status : undefined);

  const planned: { key: string; label: string; at?: string; note?: string }[] =
    [
      { key: "received", label: t("visa.step.received"), at: a.createdAt },
      {
        key: "review",
        label: t("visa.step.review"),
        note:
          a.status === "INFO_REQUESTED" ? t("visa.step.infoNote") : undefined
      },
      {
        key: "lodged",
        label: t("visa.step.lodged"),
        at: at("STATUS_LODGED"),
        note:
          a.status === "APPOINTMENT" && a.appointment
            ? t("visa.step.appointmentNote", {
                date: fmtAt(a.appointment.at, locale)
              })
            : undefined
      },
      {
        key: "decision",
        label: t(
          outcome === "APPROVED"
            ? "visa.step.approved"
            : outcome === "REFUSED"
              ? "visa.step.refused"
              : "visa.step.decision"
        ),
        at: a.decision?.at
      },
      {
        key: "completed",
        label: t(
          outcome === "REFUSED" ? "visa.step.returned" : "visa.step.completed"
        ),
        at: at("STATUS_COMPLETED")
      }
    ];

  const steps: {
    key: string;
    label: string;
    state: StepState;
    at?: string;
    note?: string;
  }[] = [];
  for (const [i, s] of planned.entries()) {
    if (i < current) {
      steps.push({ ...s, state: "done" });
    } else if (a.status === "CANCELLED") {
      steps.push({
        key: "cancelled",
        label: t("visa.status.CANCELLED"),
        state: "cancelled",
        at: at("STATUS_CANCELLED")
      });
      break;
    } else {
      steps.push({ ...s, state: i === current ? "current" : "todo" });
    }
  }

  const icon = (state: StepState) =>
    state === "done" ? (
      <CheckCircle2 className="size-5 text-ok-600" />
    ) : state === "current" ? (
      <CircleDot className="size-5 text-brand-500" />
    ) : state === "cancelled" ? (
      <XCircle className="size-5 text-bad-600" />
    ) : (
      <Circle className="size-5 text-ink-300" />
    );

  return (
    <ol>
      {steps.map((s, i) => (
        <li key={s.key} className="flex gap-3">
          <div className="flex flex-col items-center" aria-hidden="true">
            {icon(s.state)}
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "my-1 min-h-4 w-0.5 flex-1 rounded",
                  s.state === "done" ? "bg-ok-600" : "bg-ink-100"
                )}
              />
            )}
          </div>
          <div className={cn("min-w-0", i < steps.length - 1 && "pb-4")}>
            <p
              className={cn(
                "leading-tight",
                s.state === "todo" && "text-ink-500",
                s.state === "cancelled" && "font-semibold text-bad-600",
                (s.state === "done" || s.state === "current") &&
                  "font-semibold text-ink-900"
              )}
            >
              {s.label}
              {s.state === "current" && (
                <span className="sr-only"> ({t("visa.step.now")})</span>
              )}
            </p>
            {s.note ? (
              <p className="text-sm text-warn-600">{s.note}</p>
            ) : s.at && s.state !== "todo" ? (
              <p className="text-sm text-ink-500">{visaDay(s.at, locale)}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
