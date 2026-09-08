import AccountLayout from "@/components/account/AccountLayout";
import { OrderStatusBadges } from "@/components/account/order";
import { Price } from "@/components/site/bits";
import { fmtDate } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { useMyOrders } from "@/lib/orders";
import { Order } from "@/typescript/interface/domain.interface";
import Link from "next/link";
import { NoBookingsSpot } from "@/components/art/spots";
import { useState } from "react";

export default function BookingsPage() {
  const { t, locale } = usePrefs();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data: orders = [] } = useMyOrders();

  const isPast = (o: Order) => o.status === "COMPLETED" || o.status === "CANCELLED";
  const shown = orders.filter((o) => (tab === "past" ? isPast(o) : !isPast(o)));

  return (
    <AccountLayout title={t("account.bookings")}>
      {() => (
        <div className="space-y-4">
          <div role="tablist" className="flex gap-1 border-b border-ink-100/70">
            {(["upcoming", "past"] as const).map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${
                  tab === key
                    ? "border-brand-500 text-brand-700"
                    : "border-transparent text-ink-500 hover:text-ink-700"
                }`}
              >
                {t(key === "upcoming" ? "account.upcoming" : "account.past")}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="surface p-10 text-center">
              <NoBookingsSpot className="mx-auto mb-4 w-full max-w-[180px] text-brand-900" />
              <p className="font-semibold text-brand-900">{t("account.noBookings")}</p>
              <p className="mt-1 text-sm text-ink-500">{t("account.noBookingsBody")}</p>
              <Link
                href="/"
                className="btn btn-sm btn-primary mt-4"
              >
                {t("account.browse")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {shown.map((order) => (
                <li
                  key={order.reference}
                  className="surface p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-brand-900">
                        {order.items[0]?.listingLabel}
                      </h2>
                      <p className="font-mono text-xs text-ink-500">{order.reference}</p>
                      {order.travelDate && (
                        <p className="mt-1 text-sm text-ink-500">
                          {fmtDate(order.travelDate, locale)}
                          {order.items[0]?.endDate
                            ? ` → ${fmtDate(order.items[0].endDate, locale)}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-900">
                        <Price money={order.total} />
                      </p>
                      <Link
                        href={`/account/bookings/${order.reference}`}
                        className="text-sm font-semibold text-brand-500 hover:underline"
                      >
                        {t("account.viewBooking")}
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3">
                    <OrderStatusBadges order={order} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AccountLayout>
  );
}
