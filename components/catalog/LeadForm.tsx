import { TextAreaField, TextField } from "@/components/ui/field";
import { isEmail, normalisePhone } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { createEnquiry } from "@/lib/api";
import { saveEnquiry } from "@/lib/store";
import { toast } from "sonner";
import { EnquiryKind, Vertical } from "@/typescript/interface/domain.interface";
import { CheckCircle2, Loader2, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";

/**
 * The one lead form.
 *
 * §1.1 archetype B (Request to Book) and archetype C (Enquiry Only) capture
 * exactly the same fields and land in the same `enquiries` collection with a
 * different `kind` — so this is one component, not two that drift apart.
 */
export default function LeadForm({
  kind,
  vertical,
  listingLabel,
  defaultMessage = "",
  compact
}: {
  kind: EnquiryKind;
  vertical: Vertical;
  listingLabel?: string;
  defaultMessage?: string;
  compact?: boolean;
}) {
  const { t, locale } = usePrefs();
  const isRtb = kind === "REQUEST_TO_BOOK";
  const [values, setValues] = useState({
    name: "",
    phone: "",
    email: "",
    message: defaultMessage
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  /** Client-side validation is UX only (§10.8). The server revalidates. */
  function validate() {
    const next: Record<string, string> = {};
    if (values.name.trim().length < 3) next.name = t("err.name");
    if (!normalisePhone(values.phone)) next.phone = t("err.phone");
    if (values.email && !isEmail(values.email)) next.email = t("err.email");
    if (!values.message.trim()) next.message = t("err.required");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const payload = {
      kind,
      vertical,
      customerName: values.name.trim(),
      phone: normalisePhone(values.phone)!,
      email: values.email.trim() || undefined,
      message: values.message.trim(),
      listingLabel
    };
    try {
      // The server owns the reference and the idempotency window (§4.6).
      const { reference: ref } = await createEnquiry(payload);
      // Mirrored locally so "My enquiries" works before the customer signs in.
      saveEnquiry({ ...payload, reference: ref });
      setReference(ref);
      toast.success(t(isRtb ? "rtb.sent" : "enquiry.sent"), {
        description: t(isRtb ? "rtb.sentBody" : "enquiry.sentBody", { ref })
      });
    } catch {
      // §8: a generic message to the customer; the detail stays in the log.
      toast.error(t("common.error"), {
        description:
          locale === "fr"
            ? "Votre demande n'a pas pu être envoyée. Appelez-nous au +243 81 000 00 00."
            : "Your request could not be sent. Call us on +243 81 000 00 00."
      });
    } finally {
      setBusy(false);
    }
  }

  if (reference) {
    return (
      <div className="animate-fade-up rounded-card bg-ok-100 p-6 ring-1 ring-ok-600/20 ring-inset">
        <p className="flex items-center gap-2 text-md font-bold text-ok-600">
          <CheckCircle2 className="size-5" />
          {t(isRtb ? "rtb.sent" : "enquiry.sent")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          {t(isRtb ? "rtb.sentBody" : "enquiry.sentBody", { ref: reference })}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="tel:+243810000000" className="btn btn-sm btn-outline">
            <Phone className="size-4" />
            {t("enquiry.callNow")}
          </a>
          <a href="https://wa.me/243810000000" className="btn btn-sm btn-outline">
            <MessageCircle className="size-4" />
            {t("enquiry.whatsapp")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <TextField
          label={t("rtb.name")}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          onBlur={validate}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          label={t("rtb.phone")}
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          onBlur={validate}
          error={errors.phone}
          inputMode="tel"
          autoComplete="tel"
          helper={errors.phone ? undefined : "+243 …"}
        />
      </div>

      <TextField
        label={`${t("rtb.email")}`}
        type="email"
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        onBlur={validate}
        error={errors.email}
        autoComplete="email"
      />

      <TextAreaField
        label={t(isRtb ? "rtb.details" : "enquiry.message")}
        value={values.message}
        onChange={(e) => set("message", e.target.value)}
        onBlur={validate}
        error={errors.message}
        helper={
          errors.message
            ? undefined
            : t(isRtb ? "rtb.detailsPlaceholder" : "enquiry.messagePlaceholder")
        }
      />

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="btn btn-md btn-primary w-full sm:w-auto"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {t(isRtb ? "rtb.submit" : "enquiry.submit")}
      </button>

      <p className="text-xs leading-relaxed text-ink-500">
        {locale === "fr"
          ? "Nous n'utilisons votre numéro que pour cette demande. Aucune somme n'est prélevée à cette étape."
          : "We use your number only for this request. Nothing is charged at this stage."}
      </p>
    </form>
  );
}
