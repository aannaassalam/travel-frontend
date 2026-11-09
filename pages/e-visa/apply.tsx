import { Breadcrumbs, Price, SettlementNote } from "@/components/site/bits";
import Layout from "@/components/site/Layout";
import {
  DateField,
  SelectField,
  TextAreaField,
  TextField
} from "@/components/ui/field";
import DropZone from "@/components/visa/DropZone";
import { flagOf } from "@/components/visa/status";
import { ApiError } from "@/lib/api";
import { useSiteContact } from "@/lib/contact";
import { COUNTRIES } from "@/lib/countries";
import { intlLocale } from "@/lib/i18n";
import { price, resolve } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  ADDRESS_MAX,
  addDaysIso,
  ageOn,
  checkVisaForm,
  createVisaApplication,
  feeMoney,
  getVisaCatalogue,
  isRush,
  passportNeededBy,
  PURPOSE_MAX,
  todayIso,
  VISA_ERRORS,
  visaDay,
  visaRefusal,
  type VisaApplication,
  type VisaField,
  type VisaForm
} from "@/lib/visa";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  Stamp,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

type Slot = "passport" | "hotel" | "invitation" | "photo";
type Files = Partial<Record<Slot, File>>;

/**
 * The picked files outlive this page while the visitor signs in: the login
 * page is a client-side navigation, so the page unmounts but this module stays.
 * A reload loses them (files cannot go into sessionStorage); the form then
 * asks for those again, and only those.
 */
let kept: Files = {};

/** The typed answers, kept for this tab through the sign-in and a reload. */
const DRAFT_KEY = "ev.apply";

const EMPTY: VisaForm = {
  countryId: "",
  townId: "",
  departureDate: "",
  returnDate: "",
  bookingReference: "",
  purpose: "",
  stayAddress: "",
  stayFrom: "",
  stayTo: "",
  offerId: "",
  personTypeId: "",
  invitationLetter: false,
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  // Most travellers who apply through a Kinshasa office are Congolese; shown, and changeable.
  nationality: "CD",
  passportNumber: "",
  passportExpiry: "",
  email: ""
};

/** "Same trip, another traveller" keeps these and clears the rest. */
const TRAVELLER_FIELDS: (keyof VisaForm)[] = [
  "personTypeId",
  "firstName",
  "lastName",
  "dateOfBirth",
  "passportNumber",
  "passportExpiry"
];

/** The client's order. A section is done when none of its fields has an issue. */
const SECTIONS: { n: number; key: string; fields: VisaField[] }[] = [
  { n: 1, key: "destination", fields: ["countryId", "townId"] },
  {
    n: 2,
    key: "schedule",
    fields: ["departureDate", "returnDate", "bookingReference"]
  },
  { n: 3, key: "purpose", fields: ["purpose"] },
  { n: 4, key: "address", fields: ["stayAddress"] },
  { n: 5, key: "stay", fields: ["stayFrom", "stayTo"] },
  { n: 6, key: "visaType", fields: ["offerId"] },
  { n: 7, key: "personType", fields: ["personTypeId"] },
  { n: 8, key: "invitation", fields: [] },
  {
    n: 9,
    key: "traveller",
    fields: [
      "firstName",
      "lastName",
      "dateOfBirth",
      "nationality",
      "passportNumber",
      "passportExpiry"
    ]
  },
  { n: 10, key: "documents", fields: ["passportFile"] }
];

const readDraft = (): { form: VisaForm; files: Slot[] } | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `ev-${Date.now()}-${Math.random()}`;

export default function EVisaApplyPage() {
  const router = useRouter();
  const { t, lz, locale, currency } = usePrefs();
  const { customer, signedIn, isPending: sessionPending } = useSession();
  const contact = useSiteContact();
  const today = useMemo(() => todayIso(), []);

  const {
    data: catalogue,
    isError,
    refetch
  } = useQuery({
    queryKey: ["visa-catalogue"],
    queryFn: ({ signal }) => getVisaCatalogue({ signal }),
    staleTime: 5 * 60_000
  });

  const [form, setForm] = useState<VisaForm>(EMPTY);
  const [files, setFilesState] = useState<Files>(() => kept);
  const [agreed, setAgreed] = useState(false);
  /** Set by the first press of Send: from then on, missing answers are named too. */
  const [tried, setTried] = useState(false);
  const [lost, setLost] = useState<Slot[]>([]);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [serverError, setServerError] = useState<{
    field?: VisaField;
    message: string;
  } | null>(null);
  const [done, setDone] = useState<VisaApplication | null>(null);
  const restored = useRef(false);
  /** One key per attempt, kept across presses until what is sent changes (§4.6). */
  const idem = useRef<{ sig: string; key: string } | null>(null);

  const set = (patch: Partial<VisaForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setServerError(null);
  };
  const setFile = (slot: Slot, file: File | null) => {
    setFilesState((prev) => {
      const next = { ...prev };
      if (file) next[slot] = file;
      else delete next[slot];
      kept = next;
      return next;
    });
    setLost((l) => l.filter((s) => s !== slot));
    setServerError(null);
  };

  // Restore once the catalogue can say what the ids mean: the draft (back from
  // signing in, or a reload), unless the link names another country.
  useEffect(() => {
    if (restored.current || !router.isReady || !catalogue) return;
    restored.current = true;
    const code = String(router.query.country ?? "").toUpperCase();
    const named = catalogue.countries.find((c) => c.code === code);
    const draft = readDraft();
    if (draft && (!named || draft.form.countryId === named.id)) {
      setForm({ ...EMPTY, ...draft.form });
      setLost(draft.files.filter((s) => !kept[s]));
      setWelcomeBack(router.query.resume === "1");
    } else if (named) {
      setForm((f) => ({ ...f, countryId: named.id }));
    }
  }, [router.isReady, router.query, catalogue]);

  // Every change is kept for this tab (files excepted, by name only).
  useEffect(() => {
    if (!restored.current || done) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form, files: Object.keys(files) })
      );
    } catch {
      /* private mode: the form still works, it just is not kept */
    }
  }, [form, files, done]);

  // The account's e-mail, when the field is still empty.
  useEffect(() => {
    if (customer?.email)
      setForm((f) => (f.email ? f : { ...f, email: customer.email! }));
  }, [customer?.email]);

  const country = catalogue?.countries.find((c) => c.id === form.countryId);
  const towns = country?.towns ?? [];
  const offers = country?.offers ?? [];
  const offer = offers.find((o) => o.id === form.offerId);
  const personTypes = catalogue?.personTypes ?? [];
  const personType = personTypes.find((p) => p.id === form.personTypeId);

  // Only one to choose from: chosen. Otherwise the visitor picks — a fee depends on it.
  useEffect(() => {
    if (towns.length === 1 && !form.townId)
      setForm((f) => ({ ...f, townId: towns[0].id }));
    if (offers.length === 1 && !form.offerId)
      setForm((f) => ({ ...f, offerId: offers[0].id }));
  }, [towns, offers, form.townId, form.offerId]);

  const months = country?.passportValidityMonths ?? 0;
  const issues = checkVisaForm(form, {
    today,
    passportValidityMonths: months,
    minor: personType?.isMinor,
    hasPassportFile: Boolean(files.passport)
  });
  if (serverError?.field) issues[serverError.field] = { code: "server" };
  const needed = passportNeededBy(form.stayTo, months);
  // Under 18 on the day of departure: the server files it as a minor's whatever the type chosen.
  const minorByAge = Boolean(
    form.dateOfBirth &&
      form.departureDate &&
      ageOn(form.dateOfBirth, form.departureDate) < 18
  );
  const rush =
    offer &&
    form.departureDate >= today &&
    isRush(form.departureDate, offer.processingDays, today);
  const sectionDone = (fields: VisaField[]) => fields.every((f) => !issues[f]);
  const missing = SECTIONS.filter((s) => !sectionDone(s.fields));
  const blocked = missing.length > 0 || !agreed;

  /** The message under a field: a broken rule at once, a missing answer after the first Send. */
  const errorOf = (k: VisaField) => {
    const issue = issues[k];
    if (!issue) return undefined;
    if (issue.code === "server") return serverError?.message;
    if (issue.code === "required" || issue.code === "passportFile") {
      return tried
        ? t(
            issue.code === "required"
              ? `visa.req.${k}`
              : "visa.err.passportFile"
          )
        : undefined;
    }
    const vars = { ...issue.vars };
    if (typeof vars.date === "string") vars.date = visaDay(vars.date, locale);
    return t(`visa.err.${issue.code}`, vars);
  };

  const nationalities = useMemo(() => {
    let names: Intl.DisplayNames | undefined;
    try {
      names = new Intl.DisplayNames([intlLocale(locale)], { type: "region" });
    } catch {
      /* an old browser: the English names */
    }
    return COUNTRIES.map((c) => ({ ...c, name: names?.of(c.code) ?? c.name }))
      .sort((a, b) =>
        a.code === "CD"
          ? -1
          : b.code === "CD"
            ? 1
            : a.name.localeCompare(b.name, intlLocale(locale))
      )
      .map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }));
  }, [locale]);

  // Charged in the currency the fee is shown in: the visitor's, or francs when it has no price in theirs.
  const charged = offer ? resolve(offer.serviceFee, currency).currency : "CDF";

  const create = useMutation({
    mutationFn: ({ body, key }: { body: FormData; key: string }) =>
      createVisaApplication(body, key)
  });

  const goSignIn = () => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form, files: Object.keys(files) })
      );
    } catch {
      /* kept in memory only */
    }
    void router.push(
      `/login?next=${encodeURIComponent("/e-visa/apply?resume=1")}`
    );
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (blocked) {
      // Take the visitor to the first thing left to do.
      const first = missing[0];
      document
        .getElementById(first ? `s-${first.key}` : "s-summary")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!signedIn && !sessionPending) return goSignIn();

    const body = new FormData();
    const fields: Record<string, string> = {
      countryId: form.countryId,
      townId: form.townId,
      offerId: form.offerId,
      personTypeId: form.personTypeId,
      departureDate: form.departureDate,
      returnDate: form.returnDate,
      stayFrom: form.stayFrom,
      stayTo: form.stayTo,
      purpose: form.purpose.trim(),
      stayAddress: form.stayAddress.trim(),
      invitationLetter: String(form.invitationLetter),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth,
      nationality: form.nationality,
      passportNumber: form.passportNumber.trim(),
      passportExpiry: form.passportExpiry,
      currency: charged,
      locale,
      acceptedTerms: "true"
    };
    if (form.email.trim()) fields.email = form.email.trim();
    if (form.bookingReference.trim())
      fields.bookingReference = form.bookingReference.trim().toUpperCase();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    const sent: Slot[] = [
      "passport",
      "hotel",
      "photo",
      ...(form.invitationLetter ? (["invitation"] as const) : [])
    ];
    for (const slot of sent)
      if (files[slot]) body.append(slot, files[slot]!, files[slot]!.name);

    const sig = JSON.stringify([
      fields,
      sent.map((s) => files[s] && [files[s]!.name, files[s]!.size])
    ]);
    if (idem.current?.sig !== sig) idem.current = { sig, key: newKey() };

    setServerError(null);
    try {
      let application: VisaApplication;
      try {
        application = await create.mutateAsync({ body, key: idem.current.key });
      } catch (err) {
        // The key was spent on something else: a fresh one, exactly once.
        if (!(err instanceof ApiError && err.code === "IDEMPOTENCY_KEY_USED"))
          throw err;
        idem.current = { sig, key: newKey() };
        application = await create.mutateAsync({ body, key: idem.current.key });
      }
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing kept */
      }
      setDone(application);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (err instanceof ApiError && err.status === 401) return goSignIn();
      if (err instanceof ApiError && err.status === 409) idem.current = null;
      // The server's code says what and where; the message is ours, in the visitor's language.
      let message = visaRefusal(err, t);
      if (code === "PASSPORT_EXPIRES_TOO_SOON") {
        // "…valid until at least 2027-06-24 (6 months after…": the day it names, written our way.
        const raw = err instanceof ApiError ? err.message : "";
        const day = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        const n = Number(raw.match(/\((\d+) month/)?.[1] ?? months);
        message = day
          ? t("visa.err.passportTooSoon", {
              date: visaDay(day, locale),
              months: n
            })
          : raw || message;
      }
      if (code === "CHOICE_UNAVAILABLE") void refetch();
      setServerError({
        field: code ? VISA_ERRORS[code]?.field : undefined,
        message
      });
    }
  }

  /** "Same trip, another traveller": the trip stays, the person and their passport go. */
  function anotherTraveller() {
    const next = { ...form };
    for (const k of TRAVELLER_FIELDS)
      (next as Record<string, unknown>)[k] = EMPTY[k];
    next.nationality = form.nationality;
    setForm(next);
    // The hotel booking is the trip's; the passport, photo and invitation are the traveller's.
    const nextFiles: Files = kept.hotel ? { hotel: kept.hotel } : {};
    kept = nextFiles;
    setFilesState(nextFiles);
    setAgreed(false);
    setTried(false);
    setLost([]);
    setWelcomeBack(false);
    idem.current = null;
    setDone(null);
    window.scrollTo({ top: 0 });
  }

  const title = t("visa.apply.title");
  const slotLabel = (s: Slot) => t(`visa.file.${s}`);

  /* ------------------------------------------------------------ confirmation */
  if (done) {
    const fee = price(feeMoney(done.fee), done.fee.chargedCurrency, locale);
    return (
      <Layout
        title={t("visa.done.title")}
        description={t("visa.description")}
        noindex
      >
        <div className="container-site max-w-3xl py-10">
          <div className="surface p-6 sm:p-8">
            <CheckCircle2 className="size-10 text-ok-600" aria-hidden="true" />
            <h1 className="display mt-3 text-[28px] leading-tight text-brand-900 sm:text-[34px]">
              {t("visa.done.title")}
            </h1>
            <p className="mt-2 text-[15px] text-ink-700">
              {t("visa.done.body", {
                name: `${done.traveller.firstName} ${done.traveller.lastName}`,
                country: lz(done.country.name)
              })}
            </p>

            <div className="mt-6 rounded-xl bg-brand-900 p-5 text-white">
              <p className="eyebrow text-accent-500">
                {t("visa.done.reference")}
              </p>
              <p
                className="mt-1 font-mono text-2xl font-bold tracking-wider sm:text-3xl"
                dir="ltr"
              >
                {done.reference}
              </p>
            </div>

            <div className="mt-6 rounded-card bg-warn-100 p-5 ring-2 ring-warn-600/30 ring-inset">
              <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
                <Banknote className="size-5 text-warn-600" aria-hidden="true" />
                {t("visa.pay.title")}
              </h2>
              <p className="mt-2 text-[15px] text-ink-900">
                {t("visa.pay.body", { fee, ref: done.reference })}
              </p>
              <p className="mt-2 text-sm text-ink-700">
                {[contact.streetAddress, contact.city]
                  .filter(Boolean)
                  .join(", ")}{" "}
                · {contact.officeHours || t("home.trustHours")}
              </p>
            </div>

            {done.rush && (
              <p className="mt-4 flex gap-2 text-sm text-warn-600">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t("visa.done.rush")}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/account/visas/${encodeURIComponent(done.reference)}`}
                className="btn btn-md btn-dark"
              >
                {t("visa.done.view")}
              </Link>
              <button
                type="button"
                onClick={anotherTraveller}
                className="btn btn-md btn-outline"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                {t("visa.done.another")}
              </button>
            </div>
            <p className="mt-3 text-sm text-ink-500">
              {t("visa.done.anotherHint")}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  /* -------------------------------------------------------------------- form */
  const section = (key: string) => SECTIONS.find((s) => s.key === key)!;
  const heading = (k: string, intro?: string) => {
    const s = section(k);
    const ok = sectionDone(s.fields);
    return (
      <div className="mb-5 flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white transition-colors",
            ok ? "bg-ok-600" : "bg-brand-900"
          )}
        >
          {ok ? <Check className="size-4" /> : s.n}
        </span>
        <div className="min-w-0">
          <h2 id={`s-${k}-h`} className="text-lg font-bold text-brand-900">
            <span className="sr-only">{s.n}. </span>
            {t(`visa.s.${k}`)}
            {ok && <span className="sr-only"> ({t("visa.sectionDone")})</span>}
          </h2>
          {intro && <p className="mt-0.5 text-sm text-ink-500">{intro}</p>}
        </div>
      </div>
    );
  };
  const box = "surface p-5 sm:p-6";

  return (
    <Layout title={title} description={t("visa.apply.description")} noindex>
      <div className="bg-brand-900 text-white">
        <div className="container-site py-8 sm:py-10">
          <p className="eyebrow mb-3 flex items-center gap-2 text-accent-500">
            <Stamp className="size-4" aria-hidden="true" />
            {t("nav.evisa")}
          </p>
          <h1 className="display max-w-2xl text-[28px] leading-tight sm:text-[36px]">
            {country
              ? t("visa.apply.titleFor", { country: lz(country.name) })
              : title}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">
            {t("visa.apply.description")}
          </p>
        </div>
      </div>

      <div className="container-site py-8">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.evisa"), href: "/e-visa" },
            { label: title }
          ]}
        />

        {welcomeBack && (
          <p
            role="status"
            className="mb-6 flex gap-2 rounded-xl bg-ok-100 px-4 py-3 text-sm font-medium text-ok-600"
          >
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {t("visa.apply.welcomeBack")}
          </p>
        )}

        {isError && !catalogue ? (
          <div className="rounded-card bg-bad-100 p-8 text-center ring-1 ring-bad-600/20 ring-inset">
            <AlertTriangle className="mx-auto mb-3 size-8 text-bad-600" />
            <p className="font-bold text-brand-900">{t("common.error")}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn btn-md btn-dark mt-5"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            noValidate
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
          >
            <div className="min-w-0 space-y-6">
              {/* 1 — destination */}
              <section
                id="s-destination"
                aria-labelledby="s-destination-h"
                className={box}
              >
                {heading("destination")}
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label={t("visa.f.country")}
                    value={form.countryId}
                    placeholder={
                      catalogue ? t("visa.f.choose") : t("common.loading")
                    }
                    onValueChange={(v) =>
                      set({ countryId: v, townId: "", offerId: "" })
                    }
                    options={(catalogue?.countries ?? []).map((c) => ({
                      value: c.id,
                      label: `${flagOf(c.code)} ${lz(c.name)}`
                    }))}
                    error={errorOf("countryId")}
                  />
                  <SelectField
                    label={t("visa.f.town")}
                    value={form.townId}
                    placeholder={
                      country ? t("visa.f.choose") : t("visa.f.countryFirst")
                    }
                    disabled={!country}
                    onValueChange={(v) => set({ townId: v })}
                    options={towns.map((tw) => ({
                      value: tw.id,
                      label: lz(tw.name)
                    }))}
                    error={errorOf("townId")}
                    helper={t("visa.h.town")}
                  />
                </div>
                {country && lz(country.notes) && (
                  <div className="mt-4 flex gap-3 rounded-xl bg-brand-50 p-4 text-sm text-ink-700 ring-1 ring-brand-100 ring-inset">
                    <Info
                      className="mt-0.5 size-4 shrink-0 text-brand-500"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-brand-900">
                        {t("visa.countryNotes", { country: lz(country.name) })}
                      </p>
                      <p className="mt-1 whitespace-pre-line">
                        {lz(country.notes)}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* 2 — travel schedule */}
              <section
                id="s-schedule"
                aria-labelledby="s-schedule-h"
                className={box}
              >
                {heading("schedule", t("visa.i.schedule"))}
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField
                    label={t("visa.f.departure")}
                    locale={locale}
                    value={form.departureDate}
                    onChange={(v) => set({ departureDate: v })}
                    error={errorOf("departureDate")}
                  />
                  <DateField
                    label={t("visa.f.return")}
                    locale={locale}
                    value={form.returnDate}
                    onChange={(v) => set({ returnDate: v })}
                    error={errorOf("returnDate")}
                  />
                </div>
                {rush && offer && (
                  <p
                    role="status"
                    className="mt-4 flex gap-2 rounded-xl bg-warn-100 px-4 py-3 text-sm text-ink-900"
                  >
                    <Clock
                      className="mt-0.5 size-4 shrink-0 text-warn-600"
                      aria-hidden="true"
                    />
                    {t("visa.rush", {
                      date: visaDay(
                        addDaysIso(today, offer.processingDays),
                        locale
                      ),
                      n: offer.processingDays
                    })}
                  </p>
                )}
                <TextField
                  className="mt-4"
                  label={`${t("visa.f.bookingRef")} (${t("common.optional")})`}
                  value={form.bookingReference}
                  onChange={(e) => set({ bookingReference: e.target.value })}
                  error={errorOf("bookingReference")}
                  helper={t("visa.h.bookingRef")}
                  autoComplete="off"
                  maxLength={40}
                />
              </section>

              {/* 3 — reason for travel */}
              <section
                id="s-purpose"
                aria-labelledby="s-purpose-h"
                className={box}
              >
                {heading("purpose")}
                <TextAreaField
                  label={t("visa.f.purpose")}
                  value={form.purpose}
                  onChange={(e) => set({ purpose: e.target.value })}
                  rows={3}
                  maxLength={PURPOSE_MAX}
                  error={errorOf("purpose")}
                  helper={`${t("visa.h.purpose")} · ${form.purpose.length}/${PURPOSE_MAX}`}
                />
              </section>

              {/* 4 — address during the stay */}
              <section
                id="s-address"
                aria-labelledby="s-address-h"
                className={box}
              >
                {heading("address")}
                <TextAreaField
                  label={t("visa.f.address")}
                  value={form.stayAddress}
                  onChange={(e) => set({ stayAddress: e.target.value })}
                  rows={2}
                  maxLength={ADDRESS_MAX}
                  autoComplete="off"
                  error={errorOf("stayAddress")}
                  helper={`${t("visa.h.address")} · ${form.stayAddress.length}/${ADDRESS_MAX}`}
                />
              </section>

              {/* 5 — stay period */}
              <section id="s-stay" aria-labelledby="s-stay-h" className={box}>
                {heading(
                  "stay",
                  country
                    ? t("visa.i.stay", { country: lz(country.name) })
                    : t("visa.i.stayAny")
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField
                    label={t("visa.f.stayFrom")}
                    locale={locale}
                    value={form.stayFrom}
                    onChange={(v) => set({ stayFrom: v })}
                    error={errorOf("stayFrom")}
                  />
                  <DateField
                    label={t("visa.f.stayTo")}
                    locale={locale}
                    value={form.stayTo}
                    onChange={(v) => set({ stayTo: v })}
                    error={errorOf("stayTo")}
                  />
                </div>
                {form.departureDate &&
                  form.returnDate &&
                  (form.stayFrom !== form.departureDate ||
                    form.stayTo !== form.returnDate) && (
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          stayFrom: form.departureDate,
                          stayTo: form.returnDate
                        })
                      }
                      className="mt-3 text-sm font-semibold text-brand-600 hover:underline"
                    >
                      {t("visa.sameAsTravel", {
                        from: visaDay(form.departureDate, locale),
                        to: visaDay(form.returnDate, locale)
                      })}
                    </button>
                  )}
              </section>

              {/* 6 — visa type */}
              <section
                id="s-visaType"
                aria-labelledby="s-visaType-h"
                className={box}
              >
                {heading("visaType", t("visa.i.visaType"))}
                {!country ? (
                  <p className="text-sm text-ink-500">
                    {t("visa.f.countryFirst")}
                  </p>
                ) : (
                  <div
                    role="radiogroup"
                    aria-labelledby="s-visaType-h"
                    className="space-y-3"
                  >
                    {offers.map((o) => {
                      const on = o.id === form.offerId;
                      return (
                        <label
                          key={o.id}
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-xl p-4 ring-inset transition-colors",
                            on
                              ? "bg-brand-50 ring-2 ring-brand-500"
                              : "ring-1 ring-ink-100 hover:ring-brand-400"
                          )}
                        >
                          <input
                            type="radio"
                            name="offer"
                            value={o.id}
                            checked={on}
                            onChange={() => set({ offerId: o.id })}
                            className="mt-1 size-4 shrink-0 accent-brand-900"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <span className="font-bold text-brand-900">
                                {lz(o.visaType.name)}
                              </span>
                              <span className="text-end">
                                <Price
                                  money={o.serviceFee}
                                  className="block font-bold text-brand-900"
                                />
                                <span className="block text-xs text-ink-500">
                                  {t("visa.offer.ourFee")}
                                </span>
                              </span>
                            </span>
                            {lz(o.visaType.description) && (
                              <span className="mt-1 block text-sm text-ink-500">
                                {lz(o.visaType.description)}
                              </span>
                            )}
                            <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
                              {o.processingDays > 0 && (
                                <span>
                                  {t("visa.offer.processing")} :{" "}
                                  <strong>
                                    {t("visa.days", { n: o.processingDays })}
                                  </strong>
                                </span>
                              )}
                              {(o.validityDays ?? 0) > 0 && (
                                <span>
                                  {t("visa.offer.validity")} :{" "}
                                  <strong>
                                    {t("visa.days", { n: o.validityDays! })}
                                  </strong>
                                </span>
                              )}
                              {o.entries && (
                                <span>
                                  <strong>
                                    {t(`visa.offer.${o.entries}`)}
                                  </strong>
                                </span>
                              )}
                              {o.embassyFee && (
                                <span>
                                  {t("visa.offer.embassyFee")} :{" "}
                                  <Price
                                    money={o.embassyFee}
                                    className="font-semibold"
                                  />
                                </span>
                              )}
                            </span>
                            {on && lz(o.requiredDocuments) && (
                              <span className="mt-3 block rounded-lg bg-white p-3 text-sm ring-1 ring-brand-100">
                                <span className="block font-semibold text-brand-900">
                                  {t("visa.offer.documents")}
                                </span>
                                <span className="mt-1 block whitespace-pre-line text-ink-700">
                                  {lz(o.requiredDocuments)}
                                </span>
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                    {tried && errorOf("offerId") && (
                      <p
                        role="alert"
                        className="text-sm font-medium text-bad-600"
                      >
                        {errorOf("offerId")}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* 7 — person type */}
              <section
                id="s-personType"
                aria-labelledby="s-personType-h"
                className={box}
              >
                {heading("personType", t("visa.i.personType"))}
                <div
                  role="radiogroup"
                  aria-labelledby="s-personType-h"
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {personTypes.map((p) => {
                    const on = p.id === form.personTypeId;
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-xl p-4 ring-inset transition-colors",
                          on
                            ? "bg-brand-50 ring-2 ring-brand-500"
                            : "ring-1 ring-ink-100 hover:ring-brand-400"
                        )}
                      >
                        <input
                          type="radio"
                          name="personType"
                          value={p.id}
                          checked={on}
                          onChange={() => set({ personTypeId: p.id })}
                          className="mt-1 size-4 shrink-0 accent-brand-900"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-brand-900">
                            {lz(p.name)}
                          </span>
                          {lz(p.description) && (
                            <span className="block text-sm text-ink-500">
                              {lz(p.description)}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {tried && errorOf("personTypeId") && (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-medium text-bad-600"
                  >
                    {errorOf("personTypeId")}
                  </p>
                )}
                {personType &&
                  (personType.isMinor || lz(personType.extraDocuments)) && (
                    <div className="mt-4 flex gap-3 rounded-xl bg-brand-50 p-4 text-sm text-ink-700 ring-1 ring-brand-100 ring-inset">
                      <Info
                        className="mt-0.5 size-4 shrink-0 text-brand-500"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-semibold text-brand-900">
                          {t(
                            personType.isMinor
                              ? "visa.person.minorTitle"
                              : "visa.person.extraTitle"
                          )}
                        </p>
                        {lz(personType.extraDocuments) && (
                          <p className="mt-1 whitespace-pre-line">
                            {lz(personType.extraDocuments)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </section>

              {/* 8 — letter of invitation */}
              <section
                id="s-invitation"
                aria-labelledby="s-invitation-h"
                className={box}
              >
                {heading("invitation", t("visa.i.invitation"))}
                <div
                  role="radiogroup"
                  aria-labelledby="s-invitation-h"
                  className="flex flex-wrap gap-2"
                >
                  {[true, false].map((v) => (
                    <label
                      key={String(v)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ring-inset transition-colors",
                        form.invitationLetter === v
                          ? "bg-brand-900 text-white ring-2 ring-brand-900"
                          : "bg-white text-brand-900 ring-1 ring-ink-100 hover:ring-brand-400"
                      )}
                    >
                      <input
                        type="radio"
                        name="invitationLetter"
                        checked={form.invitationLetter === v}
                        onChange={() => {
                          set({ invitationLetter: v });
                          if (!v) setFile("invitation", null);
                        }}
                        className="sr-only"
                      />
                      {t(v ? "visa.yes" : "visa.no")}
                    </label>
                  ))}
                </div>
                {form.invitationLetter && (
                  <div className="mt-5">
                    <DropZone
                      label={t("visa.file.invitation")}
                      hint={t("visa.fh.invitation")}
                      optional
                      file={files.invitation}
                      onChange={(f) => setFile("invitation", f)}
                    />
                  </div>
                )}
              </section>

              {/* 9 — traveller, as in the passport */}
              <section
                id="s-traveller"
                aria-labelledby="s-traveller-h"
                className={box}
              >
                {heading("traveller", t("visa.i.traveller"))}
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label={t("checkout.firstName")}
                    value={form.firstName}
                    onChange={(e) => set({ firstName: e.target.value })}
                    error={errorOf("firstName")}
                    helper={t("visa.h.names")}
                    autoComplete="off"
                  />
                  <TextField
                    label={t("checkout.lastName")}
                    value={form.lastName}
                    onChange={(e) => set({ lastName: e.target.value })}
                    error={errorOf("lastName")}
                    autoComplete="off"
                  />
                  <DateField
                    label={t("checkout.dob")}
                    locale={locale}
                    value={form.dateOfBirth}
                    max={today}
                    onChange={(v) => set({ dateOfBirth: v })}
                    error={errorOf("dateOfBirth")}
                    helper={
                      minorByAge && !personType?.isMinor
                        ? t("visa.person.minorHint")
                        : undefined
                    }
                  />
                  <SelectField
                    label={t("checkout.nationality")}
                    value={form.nationality}
                    onValueChange={(v) => set({ nationality: v })}
                    options={nationalities}
                    error={errorOf("nationality")}
                  />
                  <TextField
                    label={t("visa.f.passportNumber")}
                    value={form.passportNumber}
                    onChange={(e) =>
                      set({
                        passportNumber: e.target.value
                          .toUpperCase()
                          .replace(/[\s-]+/g, "")
                      })
                    }
                    error={errorOf("passportNumber")}
                    helper={t("visa.h.passportNumber")}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={20}
                    dir="ltr"
                  />
                  <DateField
                    label={t("visa.f.passportExpiry")}
                    locale={locale}
                    value={form.passportExpiry}
                    // Passports run ten years: the calendar reaches that far.
                    max={addDaysIso(today, 366 * 11)}
                    onChange={(v) => set({ passportExpiry: v })}
                    error={errorOf("passportExpiry")}
                    helper={
                      needed
                        ? t("visa.h.passportExpiry", {
                            date: visaDay(needed, locale),
                            months
                          })
                        : t("visa.h.passportExpiryAny")
                    }
                  />
                </div>
                <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
                  <Lock
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {t("visa.privacy")}
                </p>
              </section>

              {/* 10 — documents */}
              <section
                id="s-documents"
                aria-labelledby="s-documents-h"
                className={box}
              >
                {heading("documents", t("visa.i.documents"))}
                {lost.length > 0 && (
                  <p
                    role="alert"
                    className="mb-5 flex gap-2 rounded-xl bg-warn-100 px-4 py-3 text-sm text-ink-900"
                  >
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0 text-warn-600"
                      aria-hidden="true"
                    />
                    {t("visa.file.lost", {
                      files: lost.map(slotLabel).join(", ")
                    })}
                  </p>
                )}
                <div className="space-y-6">
                  <DropZone
                    label={t("visa.file.passport")}
                    hint={t("visa.fh.passport")}
                    file={files.passport}
                    onChange={(f) => setFile("passport", f)}
                    error={errorOf("passportFile")}
                  />
                  <DropZone
                    label={t("visa.file.hotel")}
                    hint={t("visa.fh.hotel")}
                    optional
                    file={files.hotel}
                    onChange={(f) => setFile("hotel", f)}
                  />
                  <DropZone
                    label={t("visa.file.photo")}
                    hint={t("visa.fh.photo")}
                    optional
                    file={files.photo}
                    onChange={(f) => setFile("photo", f)}
                  />
                </div>
              </section>
            </div>

            {/* 11 — summary */}
            <aside
              id="s-summary"
              aria-labelledby="s-summary-h"
              className="lg:sticky lg:top-header lg:self-start"
            >
              <div className="surface space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-500 text-sm font-bold text-brand-900"
                  >
                    11
                  </span>
                  <h2
                    id="s-summary-h"
                    className="text-lg font-bold text-brand-900"
                  >
                    {t("visa.s.summary")}
                  </h2>
                </div>

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">{t("visa.f.country")}</dt>
                    <dd className="text-end font-semibold text-ink-900">
                      {country
                        ? [
                            lz(country.name),
                            lz(towns.find((tw) => tw.id === form.townId)?.name)
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">{t("visa.s.visaType")}</dt>
                    <dd className="text-end font-semibold text-ink-900">
                      {offer ? lz(offer.visaType.name) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">{t("visa.s.traveller")}</dt>
                    <dd className="min-w-0 truncate text-end font-semibold text-ink-900">
                      {[form.firstName, form.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </dd>
                  </div>
                  {form.departureDate && form.returnDate && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-500">{t("visa.s.schedule")}</dt>
                      <dd className="text-end font-semibold text-ink-900">
                        {visaDay(form.departureDate, locale)} →{" "}
                        {visaDay(form.returnDate, locale)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="space-y-2 border-t border-ink-100 pt-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-bold text-brand-900">
                      {t("visa.offer.ourFee")}
                    </span>
                    <span className="text-lg font-bold text-brand-900">
                      {offer ? <Price money={offer.serviceFee} /> : "—"}
                    </span>
                  </div>
                  {offer && <SettlementNote money={offer.serviceFee} />}
                  {offer?.embassyFee && (
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-ink-500">
                        {t("visa.offer.embassyFee")}
                      </span>
                      <Price
                        money={offer.embassyFee}
                        className="text-ink-700"
                      />
                    </div>
                  )}
                  {offer?.embassyFee && (
                    <p className="text-xs text-ink-500">
                      {t("visa.embassyNote")}
                    </p>
                  )}
                </div>

                <p className="flex gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-ink-700">
                  <Banknote
                    className="mt-0.5 size-4 shrink-0 text-brand-500"
                    aria-hidden="true"
                  />
                  {t("visa.payLater")}
                </p>

                <TextField
                  label={`${t("visa.f.email")} (${t("common.optional")})`}
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  error={errorOf("email")}
                  autoComplete="email"
                  dir="ltr"
                />

                {/* Separate, unticked, blocking: what the fee does and does not buy. */}
                <label
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border-2 p-4",
                    tried && !agreed
                      ? "border-bad-600 bg-bad-100"
                      : "border-brand-900 bg-white"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    aria-invalid={tried && !agreed}
                    className="mt-0.5 size-5 shrink-0 accent-brand-900"
                  />
                  <span className="text-sm font-medium text-ink-900">
                    {lz(catalogue?.consent) || t("visa.terms")}
                  </span>
                </label>

                {serverError && !serverError.field && (
                  <p
                    role="alert"
                    className="rounded-xl bg-bad-100 p-3 text-sm text-bad-600"
                  >
                    {serverError.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={create.isPending}
                  aria-disabled={blocked || undefined}
                  className={cn(
                    "w-full rounded-md px-6 py-3.5 text-base font-bold text-brand-900 transition-colors disabled:opacity-50",
                    blocked
                      ? "cursor-not-allowed bg-accent-500/40"
                      : "bg-accent-500 hover:bg-accent-600"
                  )}
                >
                  {create.isPending ? t("common.loading") : t("visa.submit")}
                </button>

                {blocked && (
                  <div className="text-sm text-ink-500">
                    <p>{t("visa.left")}</p>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {missing.map((s) => (
                        <li key={s.key}>
                          <a
                            href={`#s-${s.key}`}
                            className="font-semibold text-brand-600 hover:underline"
                          >
                            {t(`visa.s.${s.key}`)}
                          </a>
                        </li>
                      ))}
                      {!agreed && (
                        <li className="font-semibold text-ink-700">
                          {t("visa.s.terms")}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {!signedIn && !sessionPending && (
                  <p className="flex gap-2 text-xs text-ink-500">
                    <Lock
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    {t("visa.signInNote")}
                  </p>
                )}
              </div>
            </aside>
          </form>
        )}
      </div>
    </Layout>
  );
}
