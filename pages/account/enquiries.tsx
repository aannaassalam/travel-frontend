import AccountLayout from "@/components/account/AccountLayout";
import { Price } from "@/components/site/bits";
import { fmtDateTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { getEnquiries } from "@/lib/store";
import { Enquiry } from "@/typescript/interface/domain.interface";
import Link from "next/link";
import { useEffect, useState } from "react";

const STAGE_TONE: Record<string, string> = {
  NEW: "bg-brand-100 text-brand-700",
  CONTACTED: "bg-brand-100 text-brand-700",
  QUALIFIED: "bg-warn-100 text-warn-600",
  QUOTED: "bg-accent-100 text-accent-700",
  WON: "bg-ok-100 text-ok-600",
  LOST: "bg-ink-100 text-ink-700"
};

export default function EnquiriesPage() {
  const { t, locale } = usePrefs();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  useEffect(() => setEnquiries(getEnquiries()), []);

  return (
    <AccountLayout title={t("account.enquiries")}>
      {() => (
        <div className="space-y-4">
          {enquiries.length === 0 ? (
            <div className="surface p-10 text-center">
              <p className="font-semibold text-brand-900">{t("account.noEnquiries")}</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
                {locale === "fr"
                  ? "Vos demandes de devis et vos demandes d'informations sur un bien apparaîtront ici."
                  : "Your quote requests and property enquiries will appear here."}
              </p>
              <Link
                href="/property"
                className="mt-4 inline-flex rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold text-brand-900"
              >
                {t("account.browse")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {enquiries.map((e) => (
                <li key={e.reference} className="surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-brand-900">
                        {e.listingLabel ??
                          (e.kind === "REQUEST_TO_BOOK"
                            ? t("rtb.title")
                            : t("enquiry.title"))}
                      </h2>
                      <p className="font-mono text-xs text-ink-500">{e.reference}</p>
                      <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-ink-700">
                        {e.message}
                      </p>
                      <p className="mt-2 text-xs text-ink-500">
                        {fmtDateTime(e.createdAt, locale)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-bold ${STAGE_TONE[e.stage]}`}
                      >
                        {t(`enq.${e.stage}`)}
                      </span>
                      {e.quotedAmount != null && (
                        <p className="mt-2 font-bold text-brand-900">
                          <Price money={e.quotedAmount} />
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="rounded-card bg-ink-50 p-5 ring-1 ring-ink-100 ring-inset text-sm text-ink-700">
            {locale === "fr"
              ? "Nous répondons sous 24 heures ouvrées par téléphone ou WhatsApp. Une demande n'est jamais un engagement d'achat."
              : "We reply within 24 working hours by phone or WhatsApp. A request is never a commitment to buy."}
          </p>
        </div>
      )}
    </AccountLayout>
  );
}
