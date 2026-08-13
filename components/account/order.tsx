import { Price } from "@/components/site/bits";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Order } from "@/typescript/interface/domain.interface";
import { CheckCircle2, Circle, FileText, Download } from "lucide-react";

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

const EVENT_LABEL: Record<string, { fr: string; en: string }> = {
  ORDER_CREATED: { fr: "Réservation créée", en: "Booking created" },
  PAYMENT_RECEIVED: { fr: "Paiement reçu", en: "Payment received" },
  AWAITING_CASH_PAYMENT: {
    fr: "En attente du paiement en agence",
    en: "Awaiting cash payment"
  },
  DOCUMENTS_ISSUED: { fr: "Documents émis", en: "Documents issued" },
  ORDER_CANCELLED: { fr: "Réservation annulée", en: "Booking cancelled" }
};

export function StatusTimeline({ order }: { order: Order }) {
  const { locale } = usePrefs();
  return (
    <ol className="relative space-y-4 border-l-2 border-ink-100 pl-6">
      {order.timeline.map((entry, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[31px] top-0.5 bg-white">
            {i === 0 ? (
              <CheckCircle2 className="size-5 text-ok-600" />
            ) : (
              <Circle className="size-5 text-brand-500" />
            )}
          </span>
          <p className="font-semibold text-ink-900">
            {EVENT_LABEL[entry.event]?.[locale === "en" ? "en" : "fr"] ?? entry.event}
          </p>
          <p className="text-sm text-ink-500">{fmtDateTime(entry.at, locale)}</p>
          {entry.detail && <p className="text-sm text-ink-500">{entry.detail}</p>}
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

export function OrderDocuments({ order }: { order: Order }) {
  const { t, locale } = usePrefs();
  if (!order.documents.length) {
    return (
      <p className="text-sm text-ink-500">
        {locale === "fr"
          ? "Vos documents apparaîtront ici dès leur émission. Vous recevrez un SMS."
          : "Your documents will appear here once issued. You will get an SMS."}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {order.documents.map((doc) => (
        <li key={doc.fileName}>
          {/*
            §10.6: documents are served through short-lived signed URLs scoped
            to the authenticated owner, generated per request. This is the link
            into the account, never a permanent public URL in an email.
          */}
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl p-4 ring-1 ring-ink-100 ring-inset text-left hover:bg-ink-50"
          >
            <FileText className="size-5 shrink-0 text-brand-500" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink-900">
                {doc.fileName}
              </span>
              <span className="block text-xs text-ink-500">{doc.kind}</span>
            </span>
            <Download className="size-4 shrink-0 text-ink-500" />
            <span className="sr-only">{t("confirm.download")}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
