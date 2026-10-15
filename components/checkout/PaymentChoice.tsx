import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PaymentMethod } from "@/typescript/interface/domain.interface";
import { Banknote, CreditCard } from "lucide-react";

/**
 * How the order will be paid — on the booking payment step and the food order
 * alike.
 *
 * Two choices at most. "Online" is one choice, not four: card, mobile money or
 * a MaxiCash wallet is picked on MaxiCash's own page, and this site cannot
 * pick it for the customer. Where online cannot be offered it is not a list of
 * one radio: cash is simply stated.
 */
export default function PaymentChoice({
  value,
  onChange,
  online,
  cashLabel,
  cashNote
}: {
  value: PaymentMethod;
  onChange: (next: PaymentMethod) => void;
  /** From `useOnlinePayment`: can this order be paid online, and is online on at all. */
  online: { available: boolean; offered: boolean };
  /** Cash is "at our office" for a booking and "on delivery" for a meal. */
  cashLabel: string;
  cashNote: string;
}) {
  const { t } = usePrefs();

  if (!online.available) {
    return (
      <>
        {/* Cash only: one way to pay, stated — not a list of one radio. */}
        <p className="mt-2 text-[15px] text-ink-700">{t("checkout.cashOnly")}</p>
        <div className="mt-3 flex gap-3 rounded-lg border border-brand-500 bg-brand-50 p-4">
          <Banknote className="mt-0.5 size-5 shrink-0 text-brand-500" />
          <span className="min-w-0">
            <span className="block font-bold text-ink-900">{cashLabel}</span>
            <span className="block text-sm text-ink-500">{cashNote}</span>
          </span>
        </div>
        {/* On, but not for this currency: said, so nobody wonders where it went. */}
        {online.offered && (
          <p className="mt-3 text-sm text-ink-500">{t("checkout.onlineUsdOnly")}</p>
        )}
      </>
    );
  }

  const choices = [
    {
      id: "ONLINE" as const,
      Icon: CreditCard,
      label: t("checkout.online"),
      note: t("checkout.onlineNote")
    },
    { id: "CASH" as const, Icon: Banknote, label: cashLabel, note: cashNote }
  ];

  return (
    <div className="mt-3 space-y-3">
      {choices.map(({ id, Icon, label, note }) => (
        <label
          key={id}
          className={cn(
            "flex cursor-pointer gap-3 rounded-lg border p-4",
            value === id ? "border-brand-500 bg-brand-50" : "border-ink-100 hover:bg-ink-50"
          )}
        >
          <input
            type="radio"
            name="payment-method"
            checked={value === id}
            onChange={() => onChange(id)}
            className="mt-1 size-4 shrink-0 accent-brand-500"
          />
          <Icon className="mt-0.5 size-5 shrink-0 text-brand-500" />
          <span className="min-w-0">
            <span className="block font-bold text-ink-900">{label}</span>
            <span className="block text-sm text-ink-500">{note}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
