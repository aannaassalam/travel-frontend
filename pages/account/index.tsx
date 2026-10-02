import AccountLayout from "@/components/account/AccountLayout";
import { OrderStatusBadges } from "@/components/account/order";
import { Price } from "@/components/site/bits";
import { fmtDate } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { getEnquiries, getSaved } from "@/lib/store";
import { useMyOrders } from "@/lib/orders";
import { Enquiry } from "@/typescript/interface/domain.interface";
import { ArrowRight, CalendarCheck, Heart, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** §11.2 account dashboard. */
export default function AccountDashboard() {
  const { t, locale } = usePrefs();
  const { data: orders = [], isPending, isError } = useMyOrders();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setEnquiries(getEnquiries());
    setSaved(getSaved());
  }, []);

  const upcoming = orders.filter(
    (o) => o.status !== "CANCELLED" && o.status !== "COMPLETED"
  );

  return (
    <AccountLayout title={t("account.dashboard")}>
      {() => (
        <div className="space-y-6">
          <ul className="grid gap-4 sm:grid-cols-3">
            {[
              {
                Icon: CalendarCheck,
                label: t("account.upcoming"),
                value: upcoming.length,
                href: "/account/bookings"
              },
              {
                Icon: MessageSquareText,
                label: t("account.enquiries"),
                value: enquiries.length,
                href: "/account/enquiries"
              },
              {
                Icon: Heart,
                label: t("account.saved"),
                value: saved.length,
                href: "/account/saved"
              }
            ].map(({ Icon, label, value, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="flex items-center gap-4 surface p-5 hover:bg-ink-50"
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50">
                    <Icon className="size-5 text-brand-500" />
                  </span>
                  <span>
                    <span className="block text-2xl font-bold text-brand-900">{value}</span>
                    <span className="block text-sm text-ink-500">{label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <section className="surface p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-brand-900">{t("account.upcoming")}</h2>
              <Link
                href="/account/bookings"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:underline"
              >
                {t("home.viewAll")}
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {isPending ? (
              <p className="py-8 text-center text-sm text-ink-500">{t("common.loading")}</p>
            ) : isError ? (
              <p className="py-8 text-center text-sm text-bad-600">{t("common.error")}</p>
            ) : upcoming.length === 0 ? (
              <div className="py-8 text-center">
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
              <ul className="divide-y divide-ink-100/70">
                {upcoming.slice(0, 3).map((order) => (
                  <li key={order.reference} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/account/bookings/${order.reference}`}
                        className="font-semibold text-brand-900 hover:underline"
                      >
                        {order.items[0]?.listingLabel}
                      </Link>
                      <p className="font-mono text-xs text-ink-500">{order.reference}</p>
                      {order.travelDate && (
                        <p className="text-sm text-ink-500">
                          {fmtDate(order.travelDate, locale)}
                        </p>
                      )}
                    </div>
                    <OrderStatusBadges order={order} />
                    <p className="font-bold text-brand-900">
                      <Price money={order.total} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* §4.4: no self-service cancel button anywhere. A button that takes
              money and returns nothing generates disputes. */}
          <p className="rounded-card bg-ink-50 p-5 ring-1 ring-ink-100 ring-inset text-sm text-ink-700">
            {t("account.cancelNote")}{" "}
            <Link href="/contact" className="font-semibold text-brand-500 underline">
              {t("account.support")}
            </Link>
            {locale === "fr" ? "." : "."}
          </p>
        </div>
      )}
    </AccountLayout>
  );
}
