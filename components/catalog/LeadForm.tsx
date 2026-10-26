import { DateField, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { isEmail } from "@/lib/format";
import { addDays, bookableTimesOn, passengerMax, todayIso } from "@/lib/routes";
import { DEFAULT_COUNTRY, toE164 } from "@/lib/countries";
import { PhoneField } from "@/components/ui/PhoneField";
import { usePrefs } from "@/lib/prefs";
import { createEnquiry } from "@/lib/api";
import { dial, useSiteContact, waLink } from "@/lib/contact";
import { saveEnquiry } from "@/lib/store";
import { toast } from "sonner";
import {
  EnquiryKind,
  ListingAttributes,
  Passengers,
  Vertical
} from "@/typescript/interface/domain.interface";
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
  compact,
  route
}: {
  kind: EnquiryKind;
  vertical: Vertical;
  listingLabel?: string;
  defaultMessage?: string;
  compact?: boolean;
  /**
   * A bus or flight: its timetable. The form then also asks for the day, the
   * time and who travels, so the office can look without calling back first.
   */
  route?: ListingAttributes;
}) {
  const { t, locale } = usePrefs();
  const contact = useSiteContact();
  const isRtb = kind === "REQUEST_TO_BOOK";
  const [values, setValues] = useState({
    name: "",
    phone: "",
    email: "",
    message: defaultMessage,
    date: "",
    time: ""
  });
  const [pax, setPax] = useState<Passengers>({ adults: 1, children: 0, infants: 0 });
  // That day's departures still to come; on a day the route does not run, any time.
  const times = route && values.date ? bookableTimesOn(route, values.date) : [];
  const time = times.length && !times.includes(values.time) ? "" : values.time;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [reference, setReference] = useState<string | null>(null);

  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  /** Client-side validation is UX only (§10.8). The server revalidates. */
  function validate() {
    const next: Record<string, string> = {};
    if (values.name.trim().length < 3) next.name = t("err.name");
    if (!toE164(country, values.phone)) next.phone = t("err.phone");
    if (values.email && !isEmail(values.email)) next.email = t("err.email");
    if (!values.message.trim()) next.message = t("err.required");
    if (route) {
      if (!values.date) next.date = t("err.required");
      else if (!time) next.time = t("route.pickTime");
      // A typed time on today's date must still be to come — this device's
      // clock, as for the timetable's times.
      else if (!bookableTimesOn({ dailyTimes: [time] }, values.date).length) {
        next.time = t("route.errDeparture");
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /** Validate only the blurred field, leaving the others' errors untouched. */
  function checkField(k: "name" | "email" | "message") {
    const msg =
      k === "name"
        ? values.name.trim().length < 3
          ? t("err.name")
          : ""
        : k === "email"
          ? values.email && !isEmail(values.email)
            ? t("err.email")
            : ""
          : !values.message.trim()
            ? t("err.required")
            : "";
    setErrors((e) => ({ ...e, [k]: msg }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const payload = {
      kind,
      vertical,
      customerName: values.name.trim(),
      phone: toE164(country, values.phone)!,
      email: values.email.trim() || undefined,
      message: values.message.trim(),
      listingLabel,
      trip: route ? { date: values.date, time, ...pax } : undefined
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
        description: contact.phone
          ? locale === "fr"
            ? `Votre demande n'a pas pu être envoyée. Appelez-nous au ${contact.phone}.`
            : `Your request could not be sent. Call us on ${contact.phone}.`
          : locale === "fr"
            ? "Votre demande n'a pas pu être envoyée. Veuillez réessayer."
            : "Your request could not be sent. Please try again."
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
        {(contact.phone || contact.whatsapp) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {contact.phone && (
              <a href={`tel:${dial(contact.phone)}`} className="btn btn-sm btn-outline">
                <Phone className="size-4" />
                {t("enquiry.callNow")}
              </a>
            )}
            {contact.whatsapp && (
              <a href={waLink(contact.whatsapp)} className="btn btn-sm btn-outline">
                <MessageCircle className="size-4" />
                {t("enquiry.whatsapp")}
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {route ? (
        <>
          <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
            <DateField
              label={t("route.date")}
              locale={locale}
              value={values.date}
              onChange={(v) => set("date", v)}
              min={todayIso()}
              max={addDays(todayIso(), 365)}
              error={errors.date}
            />
            {times.length ? (
              <SelectField
                label={t("route.time")}
                options={times.map((x) => ({ value: x, label: x }))}
                value={time}
                onValueChange={(v) => set("time", v)}
                error={errors.time}
              />
            ) : (
              <TextField
                label={t("route.time")}
                type="time"
                value={values.time}
                onChange={(e) => set("time", e.target.value)}
                error={errors.time}
              />
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["adults", "route.adults", "route.adultsHint", 1, passengerMax(pax, "adults")],
                ["children", "route.children", "route.childrenHint", 0, passengerMax(pax, "children")],
                ["infants", "route.infants", "route.infantsHint", 0, passengerMax(pax, "infants")]
              ] as const
            ).map(([key, label, hint, min, max]) => (
              <SelectField
                key={key}
                label={t(label)}
                helper={t(hint)}
                options={Array.from({ length: max - min + 1 }, (_, i) => ({
                  value: String(min + i),
                  label: String(min + i)
                }))}
                value={String(pax[key])}
                onValueChange={(v) =>
                  setPax((p) =>
                    // A baby travels on an adult's lap: never more babies than adults.
                    key === "adults"
                      ? { ...p, adults: Number(v), infants: Math.min(p.infants, Number(v)) }
                      : { ...p, [key]: Number(v) }
                  )
                }
              />
            ))}
          </div>
        </>
      ) : null}

      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <TextField
          label={t("rtb.name")}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          onBlur={() => checkField("name")}
          error={errors.name}
          autoComplete="name"
        />
        {/* The acknowledgement SMS goes here, so the dialling code is chosen
            rather than typed. */}
        <PhoneField
          label={t("rtb.phone")}
          country={country}
          national={values.phone}
          onCountryChange={setCountry}
          onNationalChange={(v) => set("phone", v)}
          error={errors.phone}
        />
      </div>

      <TextField
        label={`${t("rtb.email")}`}
        type="email"
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        onBlur={() => checkField("email")}
        error={errors.email}
        autoComplete="email"
      />

      <TextAreaField
        label={t(isRtb ? "rtb.details" : "enquiry.message")}
        value={values.message}
        onChange={(e) => set("message", e.target.value)}
        onBlur={() => checkField("message")}
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
