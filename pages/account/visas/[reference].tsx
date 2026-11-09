import AccountLayout from "@/components/account/AccountLayout";
import { Price } from "@/components/site/bits";
import { TextAreaField } from "@/components/ui/field";
import { flagOf, VisaBadges, VisaProgress } from "@/components/visa/status";
import UploadBox from "@/components/visa/UploadBox";
import { ApiError } from "@/lib/api";
import { useSiteContact } from "@/lib/contact";
import { fmtDateTime } from "@/lib/format";
import { fmtAt } from "@/lib/transfers";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  cancelVisaApplication,
  feeMoney,
  getMyVisaApplication,
  getVisaDocumentLink,
  OPEN_FOR_CUSTOMER,
  visaDay,
  visaRefusal,
  type VisaApplication
} from "@/lib/visa";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Hourglass,
  MessageSquareWarning,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

/** One application: where it stands, what the customer has to do, and its papers. */
export default function VisaApplicationPage() {
  const { t } = usePrefs();
  const router = useRouter();
  const reference =
    typeof router.query.reference === "string" ? router.query.reference : "";
  const { signedIn } = useSession();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["my-visa", reference],
    queryFn: () => getMyVisaApplication(reference),
    enabled: signedIn && Boolean(reference)
  });

  return (
    <AccountLayout title={reference || t("account.visas")}>
      {() => (
        <div className="space-y-6">
          <Link
            href="/account/visas"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
          >
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            {t("account.visas")}
          </Link>
          {isPending ? (
            <p className="surface p-10 text-center text-sm text-ink-500">
              {t("common.loading")}
            </p>
          ) : error ? (
            <div className="surface p-10 text-center">
              <p className="font-semibold text-brand-900">
                {error instanceof ApiError && error.status === 404
                  ? t("visa.detail.notFound")
                  : t("common.error")}
              </p>
              {!(error instanceof ApiError && error.status === 404) && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="btn btn-sm btn-dark mt-4"
                >
                  {t("common.retry")}
                </button>
              )}
            </div>
          ) : data ? (
            <Detail a={data} />
          ) : null}
        </div>
      )}
    </AccountLayout>
  );
}

function Detail({ a }: { a: VisaApplication }) {
  const { t, lz, locale } = usePrefs();
  const open = OPEN_FOR_CUSTOMER.includes(a.status);
  const visaFile = a.documents.find((d) => d.kind === "VISA");

  return (
    <>
      <header className="flex flex-wrap items-start gap-4">
        <span className="text-4xl leading-none" aria-hidden="true">
          {flagOf(a.country.code)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-brand-900">
            {lz(a.visaTypeName)} · {lz(a.country.name)}
          </h2>
          <p className="text-sm text-ink-700">
            {a.traveller.firstName} {a.traveller.lastName} ·{" "}
            <span className="font-mono text-xs" dir="ltr">
              {a.reference}
            </span>
          </p>
          <div className="mt-2">
            <VisaBadges application={a} />
          </div>
        </div>
      </header>

      {a.paymentStatus === "UNPAID" && open && <PayPanel a={a} />}
      <StatusPanel a={a} visaFile={visaFile?.id} />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="surface p-6">
          <h3 className="mb-4 text-lg font-bold text-brand-900">
            {t("visa.detail.progress")}
          </h3>
          <VisaProgress application={a} />
        </section>

        <section className="surface p-6">
          <h3 className="mb-4 text-lg font-bold text-brand-900">
            {t("visa.detail.fees")}
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-700">{t("visa.offer.ourFee")}</dt>
              <dd className="text-end font-bold text-brand-900">
                <Price
                  money={feeMoney(a.fee)}
                  charged={a.fee.chargedCurrency}
                />
                <span
                  className={cn(
                    "block text-xs font-semibold",
                    a.paymentStatus === "PAID" ? "text-ok-600" : "text-warn-600"
                  )}
                >
                  {t(
                    a.paymentStatus === "PAID"
                      ? "visa.pay.PAID"
                      : "visa.pay.UNPAID"
                  )}
                </span>
              </dd>
            </div>
            {a.embassyFee && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-700">{t("visa.offer.embassyFee")}</dt>
                <dd className="text-end text-ink-700">
                  <Price money={a.embassyFee} />
                </dd>
              </div>
            )}
          </dl>
          {a.embassyFee && (
            <p className="mt-3 text-xs text-ink-500">{t("visa.embassyNote")}</p>
          )}
        </section>
      </div>

      <section className="surface p-6">
        <h3 className="mb-4 text-lg font-bold text-brand-900">
          {t("account.documents")}
        </h3>
        <Documents a={a} />
        {open && a.status !== "INFO_REQUESTED" && (
          <div className="mt-5 border-t border-ink-100 pt-5">
            <UploadBox reference={a.reference} />
          </div>
        )}
        {a.documentsPurgedAt && (
          <p className="mt-4 text-xs text-ink-500">
            {t("visa.detail.purged", {
              date: visaDay(a.documentsPurgedAt, locale)
            })}
          </p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="surface p-6">
          <h3 className="mb-4 text-lg font-bold text-brand-900">
            {t("visa.detail.trip")}
          </h3>
          <Rows
            rows={[
              [
                t("visa.f.country"),
                [lz(a.country.name), lz(a.townName)].filter(Boolean).join(" · ")
              ],
              [
                t("visa.s.schedule"),
                `${visaDay(a.departureDate, locale)} → ${visaDay(a.returnDate, locale)}`
              ],
              [
                t("visa.s.stay"),
                `${visaDay(a.stayFrom, locale)} → ${visaDay(a.stayTo, locale)}`
              ],
              [t("visa.f.address"), a.stayAddress],
              [t("visa.f.purpose"), a.purpose],
              [
                t("visa.s.invitation"),
                t(a.invitationLetter ? "visa.yes" : "visa.no")
              ]
            ]}
          />
          {a.rush && (
            <p className="mt-4 flex gap-2 rounded-xl bg-warn-100 px-3 py-2.5 text-sm text-ink-900">
              <Hourglass
                className="mt-0.5 size-4 shrink-0 text-warn-600"
                aria-hidden="true"
              />
              {t("visa.detail.rush")}
            </p>
          )}
        </section>

        <section className="surface p-6">
          <h3 className="mb-4 text-lg font-bold text-brand-900">
            {t("visa.s.traveller")}
          </h3>
          <Rows
            rows={[
              [
                t("visa.s.personType"),
                [lz(a.personTypeName), a.minor ? t("visa.detail.minor") : ""]
                  .filter(Boolean)
                  .join(" · ")
              ],
              [t("checkout.dob"), visaDay(a.traveller.dateOfBirth, locale)],
              [
                t("checkout.nationality"),
                a.traveller.nationality
                  ? `${flagOf(a.traveller.nationality)} ${a.traveller.nationality}`
                  : ""
              ],
              [t("visa.f.passportNumber"), a.traveller.passportNumberMasked],
              [
                t("visa.f.passportExpiry"),
                visaDay(a.traveller.passportExpiry, locale)
              ]
            ]}
          />
        </section>
      </div>

      {(a.timeline?.length ?? 0) > 0 && (
        <section className="surface p-6">
          <h3 className="mb-4 text-lg font-bold text-brand-900">
            {t("account.timeline")}
          </h3>
          <ol className="space-y-3 border-s-2 border-ink-100 ps-5">
            {a.timeline!.map((e, i) => {
              // STATUS_<status> reads as the status; the rest have their own words.
              const key = e.event.startsWith("STATUS_")
                ? `visa.status.${e.event.slice(7)}`
                : `visa.ev.${e.event}`;
              const label = t(key);
              return (
                <li key={i}>
                  <p className="font-semibold text-ink-900">
                    {label === key
                      ? e.event.replace(/_/g, " ").toLowerCase()
                      : label}
                  </p>
                  <p className="text-sm text-ink-500">
                    {fmtDateTime(e.at, locale)}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {open && <CancelLink reference={a.reference} />}
    </>
  );
}

function Rows({ rows }: { rows: [string, string | undefined][] }) {
  return (
    <dl className="space-y-2 text-sm">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="grid gap-x-4 sm:grid-cols-[9rem_1fr]">
            <dt className="text-ink-500">{k}</dt>
            <dd className="font-medium break-words whitespace-pre-line text-ink-900">
              {v}
            </dd>
          </div>
        ))}
    </dl>
  );
}

/** Unpaid: what to pay, where, and what to quote. */
function PayPanel({ a }: { a: VisaApplication }) {
  const { t, locale } = usePrefs();
  const contact = useSiteContact();
  return (
    <div className="rounded-card bg-warn-100 p-5 ring-2 ring-warn-600/30 ring-inset">
      <h3 className="flex items-center gap-2 text-lg font-bold text-brand-900">
        <Banknote className="size-5 text-warn-600" aria-hidden="true" />
        {t("visa.pay.title")}
      </h3>
      <p className="mt-2 text-[15px] text-ink-900">
        {t("visa.pay.body", {
          fee: price(feeMoney(a.fee), a.fee.chargedCurrency, locale),
          ref: a.reference
        })}
      </p>
      <p className="mt-2 text-sm text-ink-700">
        {[contact.streetAddress, contact.city].filter(Boolean).join(", ")} ·{" "}
        {contact.officeHours || t("home.trustHours")}
      </p>
      <p className="mt-2 text-sm text-ink-700">{t("visa.pay.beforeLodging")}</p>
    </div>
  );
}

/** What is happening now, and the customer's part in it if they have one. */
function StatusPanel({
  a,
  visaFile
}: {
  a: VisaApplication;
  visaFile?: string;
}) {
  const { t, locale } = usePrefs();
  const tone = {
    info: "bg-brand-50 ring-brand-100",
    warn: "bg-warn-100 ring-warn-600/30",
    ok: "bg-ok-100 ring-ok-600/25",
    bad: "bg-bad-100 ring-bad-600/20",
    quiet: "bg-ink-50 ring-ink-100"
  };
  const panel = (
    kind: keyof typeof tone,
    Icon: typeof CheckCircle2,
    title: string,
    body?: React.ReactNode
  ) => (
    <div className={cn("rounded-card p-5 ring-1 ring-inset", tone[kind])}>
      <h3 className="flex items-center gap-2 text-lg font-bold text-brand-900">
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {title}
      </h3>
      {body && (
        <div className="mt-2 space-y-2 text-[15px] text-ink-900">{body}</div>
      )}
    </div>
  );
  const d = a.decision;

  switch (a.status) {
    case "SUBMITTED":
    case "IN_REVIEW":
      return panel(
        "info",
        Hourglass,
        t("visa.next.review"),
        <p>{t("visa.next.reviewBody")}</p>
      );
    case "INFO_REQUESTED":
      return panel(
        "warn",
        MessageSquareWarning,
        t("visa.next.info"),
        <>
          {a.infoRequest?.message && (
            <blockquote className="rounded-lg bg-white p-3 whitespace-pre-line ring-1 ring-warn-600/20">
              {a.infoRequest.message}
            </blockquote>
          )}
          <p className="text-sm">{t("visa.next.infoBody")}</p>
          <UploadBox reference={a.reference} />
        </>
      );
    case "LODGED":
      return panel(
        "info",
        Hourglass,
        t("visa.next.lodged"),
        <p>{t("visa.next.lodgedBody", { n: a.processingDays ?? 0 })}</p>
      );
    case "APPOINTMENT":
      return panel(
        "info",
        CalendarClock,
        t("visa.next.appointment"),
        <>
          {a.appointment && (
            <p className="font-semibold">
              {fmtAt(a.appointment.at, locale)}
              {a.appointment.place ? ` · ${a.appointment.place}` : ""}
            </p>
          )}
          <p className="text-sm">{t("visa.next.appointmentBody")}</p>
        </>
      );
    case "APPROVED":
      return panel(
        "ok",
        CheckCircle2,
        t("visa.next.approved"),
        <>
          <DecisionLines d={d} />
          {visaFile ? (
            <DownloadButton
              reference={a.reference}
              documentId={visaFile}
              label={t("visa.next.download")}
            />
          ) : (
            <p className="text-sm">{t("visa.next.approvedCollect")}</p>
          )}
        </>
      );
    case "REFUSED":
      return panel(
        "bad",
        XCircle,
        t("visa.next.refused"),
        <>
          {d?.reason && <p className="whitespace-pre-line">{d.reason}</p>}
          <p className="text-sm">
            {t("visa.next.refusedBody", { ref: a.reference })}
          </p>
        </>
      );
    case "COMPLETED":
      return panel(
        "ok",
        CheckCircle2,
        t(
          d?.outcome === "REFUSED"
            ? "visa.next.closedRefused"
            : "visa.next.completed"
        ),
        d?.outcome === "APPROVED" ? (
          <>
            <DecisionLines d={d} />
            {visaFile && (
              <DownloadButton
                reference={a.reference}
                documentId={visaFile}
                label={t("visa.next.download")}
              />
            )}
          </>
        ) : undefined
      );
    case "CANCELLED":
      return panel(
        "quiet",
        XCircle,
        t("visa.next.cancelled"),
        a.cancellation?.reasonCode ? (
          <p>{t(`visa.cancelReason.${a.cancellation.reasonCode}`)}</p>
        ) : undefined
      );
  }
}

function DecisionLines({ d }: { d: VisaApplication["decision"] }) {
  const { t, locale } = usePrefs();
  if (!d) return null;
  return (
    <>
      {d.visaNumber && (
        <p>
          {t("visa.next.visaNumber")} :{" "}
          <strong className="font-mono" dir="ltr">
            {d.visaNumber}
          </strong>
        </p>
      )}
      {d.validFrom && d.validTo && (
        <p>
          {t("visa.next.validity", {
            from: visaDay(d.validFrom, locale),
            to: visaDay(d.validTo, locale)
          })}
        </p>
      )}
    </>
  );
}

/** A short-lived link, asked for at the moment of download and never stored. */
function useDownload(reference: string) {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const go = async (documentId: string) => {
    setBusy(documentId);
    setFailed(false);
    try {
      const { url } = await getVisaDocumentLink(reference, documentId);
      window.location.assign(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };
  return { busy, failed, go };
}

function DownloadButton({
  reference,
  documentId,
  label
}: {
  reference: string;
  documentId: string;
  label: string;
}) {
  const { t } = usePrefs();
  const { busy, failed, go } = useDownload(reference);
  return (
    <div>
      <button
        type="button"
        onClick={() => go(documentId)}
        disabled={busy !== null}
        className="btn btn-md btn-dark"
      >
        <Download className="size-4" aria-hidden="true" />
        {label}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-bad-600">
          {t("cmp.doc.downloadFailed")}
        </p>
      )}
    </div>
  );
}

function Documents({ a }: { a: VisaApplication }) {
  const { t, locale } = usePrefs();
  const { busy, failed, go } = useDownload(a.reference);
  if (!a.documents.length)
    return (
      <p className="text-sm text-ink-500">{t("visa.detail.noDocuments")}</p>
    );
  return (
    <ul className="space-y-2">
      {a.documents.map((doc) => (
        <li key={doc.id}>
          <button
            type="button"
            onClick={() => go(doc.id)}
            disabled={busy === doc.id}
            className="flex w-full items-center gap-3 rounded-xl p-4 text-start ring-1 ring-ink-100 ring-inset hover:bg-ink-50 disabled:opacity-60"
          >
            <FileText
              className={cn(
                "size-5 shrink-0",
                doc.kind === "VISA" ? "text-ok-600" : "text-brand-500"
              )}
            />
            <span className="min-w-0 flex-1">
              <span
                className="block truncate font-semibold text-ink-900"
                dir="auto"
              >
                {doc.fileName}
              </span>
              <span className="block text-xs text-ink-500">
                {t(`visa.kind.${doc.kind}`)} · {visaDay(doc.uploadedAt, locale)}
                {doc.fromOffice ? ` · ${t("visa.detail.fromOffice")}` : ""}
              </span>
            </span>
            <Download
              className="size-4 shrink-0 text-ink-500"
              aria-hidden="true"
            />
            <span className="sr-only">{t("cmp.doc.download")}</span>
          </button>
        </li>
      ))}
      {failed && (
        <li role="alert" className="text-sm text-bad-600">
          {t("cmp.doc.downloadFailed")}
        </li>
      )}
    </ul>
  );
}

/** Quiet on purpose: a link, then a plain question with the reason box, then the act. */
function CancelLink({ reference }: { reference: string }) {
  const { t } = usePrefs();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const cancel = useMutation({
    mutationFn: () => cancelVisaApplication(reference, note.trim()),
    onSuccess: () => setAsking(false)
  });
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="text-sm font-semibold text-ink-500 underline hover:text-bad-600"
      >
        {t("visa.cancel.link")}
      </button>
    );
  }
  return (
    <div className="rounded-card p-5 ring-1 ring-bad-600/30 ring-inset">
      <h3 className="font-bold text-brand-900">{t("visa.cancel.title")}</h3>
      <p className="mt-1 text-sm text-ink-700">{t("visa.cancel.body")}</p>
      <TextAreaField
        className="mt-4"
        label={`${t("visa.cancel.note")} (${t("common.optional")})`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
      />
      {cancel.isError && (
        <p role="alert" className="mt-3 text-sm text-bad-600">
          {visaRefusal(cancel.error, t)}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
          className="btn btn-md bg-bad-600 text-white hover:bg-bad-600/90"
        >
          {cancel.isPending ? t("common.loading") : t("visa.cancel.confirm")}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="btn btn-md btn-outline"
        >
          {t("visa.cancel.keep")}
        </button>
      </div>
    </div>
  );
}
