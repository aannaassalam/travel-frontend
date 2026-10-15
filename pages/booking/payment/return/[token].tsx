import Layout from "@/components/site/Layout";
import {
  ApiError,
  getPaymentStatus,
  reportPaymentReturn,
  startPayment
} from "@/lib/api";
import { dial, useSiteContact, waLink } from "@/lib/contact";
import { usePrefs } from "@/lib/prefs";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import type { GetServerSideProps } from "next";
import type { IncomingMessage } from "node:http";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Where MaxiCash sends the customer back to: /booking/payment/return/<token>,
 * with parameters of its own added.
 *
 * Landing here proves nothing — the address is in the customer's own browser —
 * so this page decides nothing. It tells the server "they are back, on this
 * address, with these parameters", and shows what the server answers. An order
 * is paid when MaxiCash itself has told the server so, which usually happens
 * a moment before the customer arrives and occasionally a while after: hence
 * the waiting state, which asks again for two minutes and then stops asking
 * without ever saying "paid" on its own authority.
 */

type Props = { token: string; params: Record<string, string> };

/** A small posted form, read without trusting it: capped, and never a throw. */
const readForm = (req: IncomingMessage) =>
  new Promise<Record<string, string>>((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size <= 10_000) chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(
          Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString("utf8")))
        );
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });

/**
 * Rendered on request, for two reasons. MaxiCash does not say how it sends the
 * customer here, and a page built ahead of time answers a POST with "405" — a
 * blank error at the worst possible moment. And what it adds may come in that
 * POST rather than in the address, where the browser could not read it.
 */
export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
  query,
  req,
  res
}) => {
  // One customer's payment: not for any cache.
  res.setHeader("Cache-Control", "private, no-store");
  const added: Record<string, string> = {};
  const take = (from: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(from)) {
      if (key === "token" || typeof value !== "string") continue;
      if (Object.keys(added).length >= 30) break;
      added[key.slice(0, 60)] = value.slice(0, 300);
    }
  };
  take(query);
  if (
    req.method === "POST" &&
    String(req.headers["content-type"] ?? "").includes("urlencoded")
  ) {
    take(await readForm(req));
  }
  return { props: { token: String(params?.token ?? ""), params: added } };
};

type View =
  | { kind: "checking" }
  | { kind: "unreachable" }
  | { kind: "invalid" }
  | { kind: "confirming"; reference: string; late: boolean }
  | { kind: "failed"; reference: string }
  | { kind: "expired"; reference: string };

/**
 * How long to wait before asking again: every 3 seconds for the first half
 * minute — when the answer nearly always comes — then every 10, for two
 * minutes in all. Nineteen questions, not forty: the server allows each
 * address only so many, and many customers share one behind a mobile network.
 */
const WAITS_MS = [...Array(10).fill(3000), ...Array(9).fill(10_000)];

export default function PaymentReturnPage({ token, params }: Props) {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const contact = useSiteContact();
  const [view, setView] = useState<View>({ kind: "checking" });
  const [busy, setBusy] = useState<"ONLINE" | "CASH" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const done = useCallback(
    (reference: string) => router.replace(`/booking/confirmation/${reference}`),
    [router]
  );

  const check = useCallback(async () => {
    setView({ kind: "checking" });
    try {
      const back = await reportPaymentReturn(token, params);
      if (back.paid) return void done(back.reference);
      if (back.cancelled) return setView({ kind: "expired", reference: back.reference });
      setView(
        back.outcome === "SUCCESS"
          ? { kind: "confirming", reference: back.reference, late: false }
          : { kind: "failed", reference: back.reference }
      );
    } catch (err) {
      setView({
        kind: err instanceof ApiError && err.status === 404 ? "invalid" : "unreachable"
      });
    }
  }, [token, params, done]);

  // Once: the server records each arrival, and React runs effects twice in
  // development.
  const told = useRef(false);
  useEffect(() => {
    if (told.current) return;
    told.current = true;
    void check();
  }, [check]);

  // MaxiCash's own word may still be on its way: ask until it arrives, then
  // stop asking and say what to expect — never "paid" unless the server did.
  const waitingFor = view.kind === "confirming" && !view.late ? view.reference : null;
  useEffect(() => {
    if (!waitingFor) return;
    let asked = 0;
    // Left this page while a question was in the air: its answer must neither
    // ask another nor move the customer from wherever they have gone.
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const ask = async () => {
      let paid = false;
      try {
        paid = (await getPaymentStatus(waitingFor)).paid;
      } catch {
        /* a dropped request is not an answer: the next one asks again */
      }
      if (stopped) return;
      if (paid) return void done(waitingFor);
      asked += 1;
      if (asked >= WAITS_MS.length) {
        return setView({ kind: "confirming", reference: waitingFor, late: true });
      }
      timer = setTimeout(ask, WAITS_MS[asked]);
    };
    timer = setTimeout(ask, WAITS_MS[0]);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [waitingFor, done]);

  /** "Try again" and "pay in cash instead", both on the same booking. */
  async function settle(reference: string, how: "ONLINE" | "CASH") {
    setProblem(null);
    setBusy(how);
    try {
      const result = await startPayment(reference, how, locale);
      if (result.status === "REDIRECT") {
        // Full navigation: this leaves our origin for MaxiCash's page.
        window.location.assign(result.paymentUrl);
        return;
      }
      await done(reference);
    } catch (err) {
      setBusy(null);
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "PAYMENT_BEING_CONFIRMED") {
        return setView({ kind: "confirming", reference, late: false });
      }
      if (code === "ORDER_CANCELLED") return setView({ kind: "expired", reference });
      setProblem(
        code === "PROVIDER_ERROR"
          ? t("pay.errProvider")
          : code === "PROVIDER_UNREACHABLE"
            ? t("pay.errUnreachable")
            : code === "CASH_ONLY" || code === "PAYMENT_UNAVAILABLE"
              ? t("pay.errUnavailable")
              : t("pay.errGeneric")
      );
    }
  }

  const Reference = ({ value }: { value: string }) => (
    <>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-ink-500">
        {t("confirm.reference")}
      </p>
      <p className="font-mono text-2xl font-bold tracking-wider text-brand-900">{value}</p>
    </>
  );

  const title =
    view.kind === "confirming"
      ? t("payReturn.confirmingTitle")
      : view.kind === "failed"
        ? t("payReturn.failedTitle")
        : view.kind === "expired"
          ? t("payReturn.expiredTitle")
          : view.kind === "invalid"
            ? t("payReturn.invalidTitle")
            : view.kind === "unreachable"
              ? t("payReturn.unreachableTitle")
              : t("payReturn.checking");

  return (
    <Layout title={title} description="" noindex>
      <div className="container-site flex min-h-[60vh] items-center justify-center py-12">
        <div className="w-full max-w-lg surface p-8 text-center">
          {view.kind === "checking" && (
            <>
              <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-500" />
              <h1 className="text-xl font-bold text-brand-900">{t("payReturn.checking")}</h1>
            </>
          )}

          {view.kind === "unreachable" && (
            <>
              <AlertTriangle className="mx-auto mb-4 size-10 text-warn-600" />
              <h1 className="text-xl font-bold text-brand-900">{title}</h1>
              <p className="mt-2 text-[15px] text-ink-700">{t("payReturn.unreachableBody")}</p>
              <button
                type="button"
                onClick={() => void check()}
                className="btn btn-lg btn-primary mt-6"
              >
                {t("common.retry")}
              </button>
            </>
          )}

          {view.kind === "confirming" && (
            <div role="status">
              {view.late ? (
                <Clock className="mx-auto mb-4 size-10 text-brand-500" />
              ) : (
                <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-500" />
              )}
              <h1 className="text-xl font-bold text-brand-900">{title}</h1>
              <p className="mt-2 text-[15px] text-ink-700">
                {t(view.late ? "payReturn.confirmingLate" : "payReturn.confirmingBody")}
              </p>
              <Reference value={view.reference} />
              <Link
                href={`/booking/confirmation/${view.reference}`}
                className="btn btn-md btn-outline mt-6"
              >
                {t("confirm.viewBooking")}
              </Link>
            </div>
          )}

          {view.kind === "failed" && (
            <>
              <AlertTriangle className="mx-auto mb-4 size-10 text-bad-600" />
              <h1 className="text-xl font-bold text-brand-900">{title}</h1>
              <p className="mt-2 text-[15px] text-ink-700">{t("payReturn.failedBody")}</p>
              <Reference value={view.reference} />
              {problem && (
                <p role="alert" className="mt-4 text-sm font-semibold text-bad-600">
                  {problem}
                </p>
              )}
              <div className="mt-6 flex flex-col items-stretch gap-3">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void settle(view.reference, "ONLINE")}
                  className="btn btn-lg btn-primary"
                >
                  {busy === "ONLINE" ? t("checkout.waitingOnline") : t("payReturn.tryAgain")}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void settle(view.reference, "CASH")}
                  className="btn btn-md btn-outline"
                >
                  {t("payReturn.payCash")}
                </button>
              </div>
            </>
          )}

          {view.kind === "expired" && (
            <>
              <Clock className="mx-auto mb-4 size-10 text-warn-600" />
              <h1 className="text-xl font-bold text-brand-900">{title}</h1>
              <p className="mt-2 text-[15px] text-ink-700">{t("payReturn.expiredBody")}</p>
              <Reference value={view.reference} />
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {contact.phone && (
                  <a href={`tel:${dial(contact.phone)}`} className="btn btn-md btn-dark">
                    {contact.phone}
                  </a>
                )}
                {contact.whatsapp && (
                  <a
                    href={waLink(contact.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-md btn-outline"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </>
          )}

          {view.kind === "invalid" && (
            <>
              <AlertTriangle className="mx-auto mb-4 size-10 text-warn-600" />
              <h1 className="text-xl font-bold text-brand-900">{title}</h1>
              <p className="mt-2 text-[15px] text-ink-700">{t("payReturn.invalidBody")}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/account/bookings" className="btn btn-md btn-dark">
                  {t("account.bookings")}
                </Link>
                <Link href="/" className="btn btn-md btn-outline">
                  {t("common.backHome")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
