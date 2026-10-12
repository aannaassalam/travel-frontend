import { Price, SettlementNote } from "@/components/site/bits";
import { getPolicy, type Policy } from "@/lib/api";
import { useCheckout, useCountdown } from "@/lib/checkout";
import { fmtDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { usePolicyNotice } from "@/lib/siteContent";
import { policyText } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Clock, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const STEPS = ["checkout.step1", "checkout.step2", "checkout.step3"];

/** §11.3: maximum three steps, and the customer can always see which one. */
export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const { t } = usePrefs();
  return (
    <nav aria-label={t("checkout.stepOf", { n: current })} className="mb-6">
      <ol className="flex items-center gap-2 sm:gap-4">
        {STEPS.map((key, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={key} className="flex flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  done && "bg-ok-600 text-white",
                  active && "bg-brand-900 text-white",
                  !done && !active && "bg-ink-100 text-ink-500"
                )}
              >
                {done ? <Check className="size-4" /> : n}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-semibold sm:inline",
                  active ? "text-brand-900" : "text-ink-500"
                )}
              >
                {t(key)}
              </span>
              {n < 3 && <span className="h-px flex-1 bg-ink-100" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * §4.5(4): show a live countdown, honestly. It counts a real hold on real
 * stock — when it hits zero the inventory genuinely goes back to the lot.
 */
export function HoldBanner() {
  const { t } = usePrefs();
  const { holdExpiresAt, expired } = useCheckout();
  const left = useCountdown(holdExpiresAt);

  if (expired || (holdExpiresAt && !left)) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-bad-100 px-5 py-4 ring-1 ring-bad-600/20 ring-inset">
        <AlertTriangle className="size-5 shrink-0 text-bad-600" />
        <p className="flex-1 text-sm font-medium text-ink-900">{t("checkout.holdExpired")}</p>
        <Link
          href="/"
          className="btn btn-sm btn-dark"
        >
          {t("checkout.holdRestart")}
        </Link>
      </div>
    );
  }
  if (!left) return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl bg-brand-50 px-5 py-4 ring-1 ring-brand-100 ring-inset">
      <Clock className="size-5 shrink-0 text-brand-500" />
      <p className="text-sm text-ink-900">
        <strong className="font-semibold">{t("checkout.holdTitle")}</strong> —{" "}
        {t("checkout.holdBody", { time: left })}
      </p>
    </div>
  );
}

/**
 * §11.3: the price breakdown is visible at every step. Nothing appears here
 * for the first time at step 3.
 */
export function Summary({ children }: { children?: React.ReactNode }) {
  const { t, locale } = usePrefs();
  const notice = usePolicyNotice();
  const { selection, subtotal, total } = useCheckout();
  if (!selection) return null;

  const unitLabel =
    selection.unitNoun === "night"
      ? t(selection.units > 1 ? "common.nights" : "common.night")
      : selection.unitNoun === "day"
        ? t(selection.units > 1 ? "common.days" : "common.day")
        : t(selection.units > 1 ? "common.people" : "common.person");

  return (
    <aside className="lg:sticky lg:top-24 lg:h-fit">
      <div className="overflow-hidden surface">
        <div className="flex gap-3 border-b border-ink-100/70 p-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-ink-50">
            <Image
              src={mediaUrl(selection.image)}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <h2 className="line-clamp-2 font-bold text-brand-900">{selection.label}</h2>
            {selection.sublabel && (
              <p className="mt-0.5 text-sm text-ink-500">{selection.sublabel}</p>
            )}
            {selection.startDate && (
              <p className="mt-1 text-sm text-ink-500">
                {fmtDate(selection.startDate, locale)}
                {selection.endDate ? ` → ${fmtDate(selection.endDate, locale)}` : ""}
              </p>
            )}
          </div>
        </div>

        <dl className="space-y-2 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">
              <Price money={selection.unitPrice} /> × {selection.quantity} ×{" "}
              {selection.units} {unitLabel}
            </dt>
            <dd className="font-medium">
              <Price money={subtotal} />
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-ink-100/70 pt-3 text-base">
            <dt className="font-bold text-brand-900">{t("checkout.totalDue")}</dt>
            <dd className="font-bold text-brand-900">
              <Price money={total} />
            </dd>
          </div>
          <div className="pt-1">
            <SettlementNote money={total} />
          </div>
          <p className="pt-1 text-xs text-ink-500">{t("listing.taxesNote")}</p>
        </dl>

        {/* §2.2(3): the policy appears in the price summary, not only at payment. */}
        <div className="border-t border-ink-100/70 bg-ink-50 p-4">
          <p className="flex gap-2 text-sm text-ink-700">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
            <span>
              <strong className="font-semibold">{t("policy.title")}</strong> —{" "}
              {notice}
            </span>
          </p>
        </div>

        {children}
      </div>
    </aside>
  );
}

/**
 * The no-refund sentence the office has published — the one the server stores
 * with the order as "the text the customer was shown" — and which version it
 * is. It used to be a copy built into this site, so editing the policy in the
 * admin changed what was recorded but not what was read. Same choice of
 * language as the server makes: the visitor's, else French.
 */
const NO_REFUND_KEY = ["policy", "NO_REFUND"];

export function useNoRefundPolicy() {
  const { locale } = usePrefs();
  const queryClient = useQueryClient();
  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: NO_REFUND_KEY,
    // Past the browser's own copy: this is the text about to be agreed to.
    queryFn: ({ signal }) => getPolicy("NO_REFUND", { signal, cache: "no-store" }),
    staleTime: 5 * 60_000,
    retry: 1
  });
  const from = data?.bodies[locale] ? locale : "fr";
  const sentence = data?.bodies[from];
  const versionId = data?.versions?.[from];
  return {
    sentence,
    versionId,
    /** What a tick is agreement to. The text itself stands in for the version
     *  when the server is too old to name one. */
    shown: versionId ?? sentence,
    isPending,
    isFetching,
    reload: () => void refetch(),
    /**
     * The sentence the server says is current, from its refusal of an order
     * made under an older one. Shown straight from that answer: asking the
     * policy address again can return the old text for minutes, from a cache
     * on the way.
     */
    replace: (current: unknown) => {
      const p = current as { versionId?: string; locale?: string; body?: string } | undefined;
      if (!p?.versionId || !p.locale || !p.body) return void refetch();
      queryClient.setQueryData<Policy>(NO_REFUND_KEY, (old) =>
        old && {
          ...old,
          bodies: { ...old.bodies, [p.locale!]: p.body },
          versions: { ...old.versions, [p.locale!]: p.versionId }
        }
      );
    }
  };
}
export type NoRefundPolicy = ReturnType<typeof useNoRefundPolicy>;

/**
 * §2.2(1) and §11.3: separate, unticked, blocking. Never bundled into the
 * general T&Cs and never pre-ticked — a pre-ticked box has no evidentiary
 * value at all, which is the entire reason this component exists.
 */
export function ConsentBox({
  policy,
  error,
  onChange,
  checked
}: {
  policy: NoRefundPolicy;
  error?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t, locale } = usePrefs();
  // Without the published sentence there is nothing to agree to: the server
  // records that one, so no stand-in may be ticked in its place.
  const failed = !policy.sentence && !policy.isPending;
  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4",
        error || failed ? "border-bad-600 bg-bad-100" : "border-brand-900 bg-white"
      )}
    >
      {failed ? (
        <div role="alert" className="text-[15px] font-medium text-ink-900">
          <p>{t("policy.loadFailed")}</p>
          <button
            type="button"
            onClick={() => policy.reload()}
            disabled={policy.isFetching}
            className="btn btn-sm btn-dark mt-3"
          >
            {t("policy.reload")}
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer gap-3">
          <input
            type="checkbox"
            checked={checked}
            // Not tickable until the sentence is the published one: agreeing to
            // a line that is replaced a moment later would be agreeing to nothing.
            disabled={!policy.sentence}
            onChange={(e) => onChange(e.target.checked)}
            aria-describedby="consent-help"
            aria-invalid={error}
            className="mt-0.5 size-5 shrink-0 accent-brand-900"
          />
          <span
            className={cn(
              "whitespace-pre-line text-[15px] font-medium text-ink-900",
              !policy.sentence && "opacity-50"
            )}
          >
            {policy.sentence ?? policyText(locale)}
          </span>
        </label>
      )}
      <p id="consent-help" className="mt-2 pl-8 text-xs text-ink-500">
        <Link href="/terms#no-refund" className="text-brand-500 underline">
          {t("policy.readFull")}
        </Link>
      </p>
      {error && (
        <p role="alert" className="mt-2 pl-8 text-sm font-semibold text-bad-600">
          {t("policy.consentRequired")}
        </p>
      )}
    </div>
  );
}
