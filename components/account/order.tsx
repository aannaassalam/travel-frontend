import { Price } from "@/components/site/bits";
import { getOrderDocumentLink } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Order } from "@/typescript/interface/domain.interface";
import { CheckCircle2, Circle, CircleDot, Download, FileText, XCircle } from "lucide-react";
import { useState } from "react";

/**
 * §4.3: three independent status axes, shown as three independent badges.
 * Never collapsed into one word — "PAID_BUT_CANCELLED" is exactly the state
 * this model exists to avoid, and hiding it in the UI recreates the problem.
 */
export function OrderStatusBadges({ order }: { order: Order }) {
  const { t } = usePrefs();
  const tone = {
    CONFIRMED: "bg-ok-100 text-ok-600",
    COMPLETED: "bg-ok-100 text-ok-600",
    SUBMITTED: "bg-warn-100 text-warn-600",
    DRAFT: "bg-ink-100 text-ink-700",
    CANCELLED: "bg-bad-100 text-bad-600"
  }[order.status];

  const payTone = {
    PAID: "bg-ok-100 text-ok-600",
    PENDING: "bg-warn-100 text-warn-600",
    UNPAID: "bg-warn-100 text-warn-600",
    FAILED: "bg-bad-100 text-bad-600",
    REVERSED: "bg-bad-100 text-bad-600"
  }[order.paymentStatus];

  return (
    <div className="flex flex-wrap gap-2">
      <span className={cn("rounded px-2.5 py-1 text-xs font-bold", tone)}>
        {t(`status.${order.status}`)}
      </span>
      <span className={cn("rounded px-2.5 py-1 text-xs font-bold", payTone)}>
        {t(`pay.${order.paymentStatus}`)}
      </span>
      <span className="rounded bg-ink-100 px-2.5 py-1 text-xs font-bold text-ink-700">
        {t(`ful.${order.fulfilmentStatus}`)}
      </span>
    </div>
  );
}

type StepState = "done" | "current" | "todo" | "cancelled";
interface Step {
  key: string;
  state: StepState;
  at?: string;
  note?: string;
}

/**
 * The booking as a journey: created → paid → confirmed → documents → done.
 * Each step is derived from the order's three status axes, not from the
 * history list — so every step that has happened wears a tick, the one in
 * hand is marked, and a cancellation ends the line where it stopped.
 */
export function orderSteps(order: Order): Step[] {
  const at = (events: string[]) =>
    order.timeline?.find((e) => events.includes(e.event))?.at;
  const paid = order.paymentStatus === "PAID";
  const cash = order.paymentMethod === "CASH";
  const confirmed = order.status === "CONFIRMED" || order.status === "COMPLETED";
  const completed = order.status === "COMPLETED";
  const documents =
    order.fulfilmentStatus === "DOCUMENTS_ISSUED" ||
    order.fulfilmentStatus === "DELIVERED" ||
    (order.documents?.length ?? 0) > 0;

  const planned: { key: string; done: boolean; at?: string; note?: string }[] = [
    { key: "created", done: true, at: order.createdAt ?? at(["ORDER_CREATED"]) },
    {
      key: cash ? "cash" : "online",
      done: paid,
      at: at(["CASH_RECEIVED", "PAYMENT_RECEIVED"]),
      note: !paid && cash && order.cashDeadline ? order.cashDeadline : undefined
    },
    {
      key: "confirmed",
      done: confirmed,
      at: at(["STATUS_CONFIRMED"]) ?? (confirmed ? at(["CASH_RECEIVED"]) : undefined)
    },
    ...(order.delivery
      ? [{ key: "delivered", done: completed, at: at(["STATUS_COMPLETED"]) }]
      : [
          { key: "documents", done: documents, at: at(["DOCUMENTS_ISSUED"]) },
          { key: "completed", done: completed, at: at(["STATUS_COMPLETED"]) }
        ])
  ];

  const steps: Step[] = [];
  let current = false;
  for (const step of planned) {
    if (step.done) {
      steps.push({ ...step, state: "done" });
      continue;
    }
    if (order.status === "CANCELLED") {
      steps.push({
        key: "cancelled",
        state: "cancelled",
        at: at(["STATUS_CANCELLED", "AUTO_CANCELLED"])
      });
      break;
    }
    steps.push({ ...step, state: current ? "todo" : "current" });
    current = true;
  }
  return steps;
}

export function OrderProgress({ order }: { order: Order }) {
  const { t, locale } = usePrefs();
  const steps = orderSteps(order);
  const label = (s: Step) => {
    switch (s.key) {
      case "created":
        return t("steps.created");
      case "cash":
        return t(s.state === "done" ? "steps.paidCash" : "steps.payCash");
      case "online":
        return t(s.state === "done" ? "steps.paidOnline" : "steps.payOnline");
      case "confirmed":
        return t("steps.confirmed");
      case "documents":
        return t(s.state === "done" ? "steps.documents" : "steps.documentsTodo");
      case "completed":
        return t("steps.completed");
      case "delivered":
        return t("steps.delivered");
      default:
        return t("steps.cancelled");
    }
  };
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
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            {icon(s.state)}
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "my-1 w-0.5 flex-1 rounded",
                  s.state === "done" ? "bg-ok-600" : "bg-ink-100"
                )}
                style={{ minHeight: 16 }}
              />
            )}
          </div>
          <div className={cn("min-w-0", i < steps.length - 1 && "pb-4")}>
            <p
              className={cn(
                "leading-tight",
                s.state === "todo" && "text-ink-500",
                s.state === "cancelled" && "font-semibold text-bad-600",
                (s.state === "done" || s.state === "current") && "font-semibold text-ink-900"
              )}
            >
              {label(s)}
            </p>
            {s.at ? (
              <p className="text-sm text-ink-500">{fmtDateTime(s.at, locale)}</p>
            ) : s.note ? (
              <p className="text-sm text-warn-600">
                {t("steps.payBy", { date: fmtDateTime(s.note, locale) })}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** What happened, in order. Every entry is in the past, so every one is ticked. */
export function StatusTimeline({ order }: { order: Order }) {
  const { t, locale } = usePrefs();
  return (
    <ol className="relative space-y-3 border-l-2 border-ink-100 pl-6">
      {order.timeline.map((entry, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[31px] top-0.5 bg-white">
            <CheckCircle2 className="size-5 text-ink-300" />
          </span>
          <p className="font-semibold text-ink-900">
            {t(`ev.${entry.event}`) === `ev.${entry.event}`
              ? entry.event.replace(/_/g, " ").toLowerCase()
              : t(`ev.${entry.event}`)}
          </p>
          <p className="text-sm text-ink-500">{fmtDateTime(entry.at, locale)}</p>
          {entry.detail && !/^\w+=/.test(entry.detail) && (
            <p className="text-sm text-ink-500">{entry.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function OrderItems({ order }: { order: Order }) {
  const { t, locale } = usePrefs();
  return (
    <ul className="divide-y divide-ink-100/70">
      {order.items.map((item, i) => (
        <li key={i} className="flex flex-wrap justify-between gap-3 py-3">
          <div>
            <p className="font-semibold text-ink-900">{item.listingLabel}</p>
            {item.startDate && (
              <p className="text-sm text-ink-500">
                {fmtDate(item.startDate, locale)}
                {item.endDate ? ` → ${fmtDate(item.endDate, locale)}` : ""}
              </p>
            )}
            <p className="text-sm text-ink-500">
              {item.quantity} × <Price money={item.unitSellPrice} />
            </p>
          </div>
          <p className="font-bold text-brand-900">
            <Price money={item.lineTotal} />
          </p>
        </li>
      ))}
      <li className="flex justify-between py-3 text-base">
        <span className="font-bold text-brand-900">{t("checkout.totalDue")}</span>
        <span className="font-bold text-brand-900">
          <Price money={order.total} />
        </span>
      </li>
    </ul>
  );
}

const DOCUMENT_KINDS = {
  ETICKET: { fr: "Billet électronique", en: "E-ticket" },
  VOUCHER: { fr: "Voucher", en: "Voucher" },
  INVOICE: { fr: "Facture", en: "Invoice" }
} as const;

export function OrderDocuments({ order }: { order: Order }) {
  const { t, locale } = usePrefs();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const download = async (id: string) => {
    setBusy(id);
    setFailed(false);
    try {
      const { url } = await getOrderDocumentLink(order.reference, id);
      // The file is served as an attachment, so this starts a download and
      // leaves the customer on their booking.
      window.location.assign(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  if (!order.documents.length) {
    return (
      <p className="text-sm text-ink-500">
        {locale === "fr"
          ? "Vos documents apparaîtront ici dès leur émission. Nous vous préviendrons."
          : "Your documents will appear here once issued. We will let you know."}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {order.documents.map((doc) => (
        <li key={doc.id}>
          {/*
            §10.6: documents are served through short-lived signed links,
            minted per request for whoever holds the booking reference — a
            guest opening the link from their SMS included. Never a permanent
            public URL.
          */}
          <button
            type="button"
            onClick={() => download(doc.id)}
            disabled={busy === doc.id}
            className="flex w-full items-center gap-3 rounded-xl p-4 ring-1 ring-ink-100 ring-inset text-left hover:bg-ink-50 disabled:opacity-60"
          >
            <FileText className="size-5 shrink-0 text-brand-500" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink-900">
                {doc.fileName}
              </span>
              <span className="block text-xs text-ink-500">
                {DOCUMENT_KINDS[doc.kind]?.[locale === "fr" ? "fr" : "en"] ?? doc.kind}
              </span>
            </span>
            <Download className="size-4 shrink-0 text-ink-500" />
            <span className="sr-only">{locale === "fr" ? "Télécharger" : "Download"}</span>
          </button>
        </li>
      ))}
      {failed && (
        <li role="alert" className="text-sm text-bad-600">
          {locale === "fr"
            ? "Téléchargement impossible pour le moment. Réessayez."
            : "Could not download right now. Please try again."}
        </li>
      )}
    </ul>
  );
}
