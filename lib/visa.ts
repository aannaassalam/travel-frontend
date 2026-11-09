import type {
  Currency,
  Localized,
  Money
} from "@/typescript/interface/domain.interface";
import { API_BASE, ApiError, get, withI18n } from "./api";
import { fmtDate, isEmail } from "./format";

/**
 * E-Visa: the public catalogue, the customer's own applications, and the rules
 * the server enforces — mirrored here so the form can say what is wrong while
 * it is being filled in, not after a round trip. The server stays the judge:
 * nothing here is trusted by it.
 */

/* ------------------------------------------------------------------ types */

type Text = Localized | string;

export interface VisaOffer {
  id: string;
  visaType: { id: string; name: Text; description?: Text };
  /** Per currency, as a sell price. What we charge. */
  serviceFee: Money;
  /** Per currency; paid to the embassy, shown for information only. */
  embassyFee?: Money;
  processingDays: number;
  validityDays?: number;
  entries?: "SINGLE" | "MULTIPLE";
  requiredDocuments?: Text;
}

export interface VisaCountry {
  id: string;
  code: string;
  name: Text;
  notes?: Text;
  /** 0: no passport validity rule. */
  passportValidityMonths: number;
  towns: { id: string; name: Text }[];
  offers: VisaOffer[];
}

export interface VisaPersonType {
  id: string;
  name: Text;
  description?: Text;
  extraDocuments?: Text;
  isMinor: boolean;
}

export interface VisaCatalogue {
  countries: VisaCountry[];
  personTypes: VisaPersonType[];
  /** The sentence the customer ticks, as the server stores it with the application. */
  consent?: Text;
}

export type VisaStatus =
  | "SUBMITTED"
  | "IN_REVIEW"
  | "INFO_REQUESTED"
  | "LODGED"
  | "APPOINTMENT"
  | "APPROVED"
  | "REFUSED"
  | "COMPLETED"
  | "CANCELLED";

export type VisaDocKind =
  | "PASSPORT"
  | "HOTEL"
  | "INVITATION"
  | "PHOTO"
  | "OTHER"
  | "VISA";

export interface VisaDocument {
  id: string;
  kind: VisaDocKind;
  fileName: string;
  uploadedAt: string;
  /** Attached by the office (the issued visa, a receipt), not by the customer. */
  fromOffice: boolean;
}

/** The public application DTO. No passport number (masked only), no storage keys. */
export interface VisaApplication {
  id: string;
  reference: string;
  status: VisaStatus;
  paymentStatus: "UNPAID" | "PAID";
  /** What is owed: the total in the currency it was charged in, and the francs. */
  fee: { chargedTotal: number; chargedCurrency: Currency; CDF: number };
  embassyFee?: Money;
  country: { code: string; name: Text };
  townName?: Text;
  visaTypeName: Text;
  personTypeName?: Text;
  departureDate: string;
  returnDate: string;
  stayFrom: string;
  stayTo: string;
  purpose?: string;
  stayAddress?: string;
  invitationLetter?: boolean;
  traveller: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    nationality?: string;
    passportNumberMasked?: string;
    passportExpiry?: string;
  };
  documents: VisaDocument[];
  infoRequest?: { message: string; at?: string };
  appointment?: { at: string; place?: string };
  decision?: {
    outcome: "APPROVED" | "REFUSED";
    at?: string;
    reason?: string;
    visaNumber?: string;
    validFrom?: string;
    validTo?: string;
  };
  cancellation?: { reasonCode: string };
  /** The customer's uploads were deleted after the application was closed (the issued visa is kept). */
  documentsPurgedAt?: string;
  rush?: boolean;
  minor?: boolean;
  processingDays?: number;
  createdAt: string;
  /** APPLICATION_SUBMITTED, PAYMENT_RECEIVED, DOCUMENTS_RECEIVED, OFFICE_DOCUMENTS_ADDED, DOCUMENTS_PURGED, STATUS_<status>. */
  timeline?: { event: string; at: string }[];
}

/** The fee as the money helpers read it: francs, and the charged currency's figure. */
export const feeMoney = (fee: VisaApplication["fee"]): Money => ({
  CDF: fee.CDF,
  [fee.chargedCurrency]: fee.chargedTotal
});

/** The customer may cancel, and add documents, only before the file goes to the embassy. */
export const OPEN_FOR_CUSTOMER: VisaStatus[] = [
  "SUBMITTED",
  "IN_REVIEW",
  "INFO_REQUESTED"
];

/* -------------------------------------------------------------------- API */

/** A JSON or multipart call that answers JSON, with the server's code kept (§8). */
async function send<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${withI18n(path)}`, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...(init.headers ?? {}) }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      body?.message ?? res.headers.get("X-Message") ?? res.statusText,
      res.status,
      body?.code,
      body
    );
  }
  return body as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body ?? {})
});

const ref = (reference: string) =>
  `/me/visa-applications/${encodeURIComponent(reference)}`;

/** GET /visa/catalogue — open countries (with towns and offers) and the person types. */
export const getVisaCatalogue = (init?: RequestInit) =>
  get<VisaCatalogue>("/visa/catalogue", init);

/** GET /me/visa-applications — newest first. */
export const getMyVisaApplications = () =>
  get<{ items: VisaApplication[] }>("/me/visa-applications").then(
    (r) => r.items
  );

/** GET /me/visa-applications/:reference — own only (404 otherwise). */
export const getMyVisaApplication = (reference: string) =>
  get<{ application: VisaApplication }>(ref(reference)).then(
    (r) => r.application
  );

/**
 * POST /me/visa-applications — multipart: the fields, then `passport` and the
 * optional `hotel`, `invitation`, `photo`. One key per attempt, reused across
 * retries, so a dropped answer replays the same application (§4.6).
 */
export const createVisaApplication = (form: FormData, idempotencyKey: string) =>
  send<{ application: VisaApplication }>("/me/visa-applications", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: form
  }).then((r) => r.application);

/** POST …/documents — `files` and their `kinds`, in the same order. */
export function uploadVisaDocuments(
  reference: string,
  files: { file: File; kind: VisaDocKind }[]
) {
  const form = new FormData();
  for (const f of files) form.append("files", f.file, f.file.name);
  form.append("kinds", JSON.stringify(files.map((f) => f.kind)));
  return send<{ application: VisaApplication }>(`${ref(reference)}/documents`, {
    method: "POST",
    body: form
  });
}

/** POST …/cancel */
export const cancelVisaApplication = (reference: string, note?: string) =>
  send<{ application: VisaApplication }>(
    `${ref(reference)}/cancel`,
    json({ note: note || undefined })
  );

/** POST …/documents/:id/link — a link valid for minutes, asked for at the moment of download. */
export const getVisaDocumentLink = (reference: string, documentId: string) =>
  send<{ url: string }>(
    `${ref(reference)}/documents/${encodeURIComponent(documentId)}/link`,
    json({})
  );

/**
 * Every refusal the server words with a code: the message that says it in the
 * visitor's language, and the field it is about when there is one.
 */
export const VISA_ERRORS: Record<string, { key: string; field?: VisaField }> = {
  PASSPORT_REQUIRED: { key: "visa.err.passportFile", field: "passportFile" },
  FILE_TYPE_NOT_ALLOWED: { key: "visa.code.fileType" },
  FILE_TOO_LARGE: { key: "visa.code.fileSize" },
  INVITATION_NOT_EXPECTED: { key: "visa.code.invitationNotExpected" },
  // The page puts the needed date into this one (see visaRefusal's callers).
  PASSPORT_EXPIRES_TOO_SOON: {
    key: "visa.err.passportTooSoon",
    field: "passportExpiry"
  },
  DEPARTURE_IN_PAST: { key: "visa.code.departurePast", field: "departureDate" },
  RETURN_BEFORE_DEPARTURE: {
    key: "visa.code.returnBeforeDeparture",
    field: "returnDate"
  },
  STAY_OUTSIDE_TRIP: { key: "visa.code.stayOutsideTrip", field: "stayFrom" },
  INVALID_DATE: { key: "visa.code.invalidDate" },
  NOT_A_MINOR: { key: "visa.code.notMinor", field: "dateOfBirth" },
  INVALID_PASSPORT_NUMBER: {
    key: "visa.err.passportNumber",
    field: "passportNumber"
  },
  INVALID_EMAIL: { key: "visa.err.email", field: "email" },
  CHOICE_UNAVAILABLE: { key: "visa.err.choiceUnavailable" },
  BOOKING_NOT_FOUND: {
    key: "visa.err.bookingNotFound",
    field: "bookingReference"
  },
  TERMS_REQUIRED: { key: "visa.code.terms" },
  IDEMPOTENCY_KEY_REQUIRED: { key: "visa.err.send" },
  IDEMPOTENCY_KEY_USED: { key: "visa.err.send" },
  VISA_LOCKED: { key: "visa.code.locked" },
  VISA_NOT_CANCELLABLE: { key: "visa.code.notCancellable" },
  TOO_MANY_DOCUMENTS: { key: "visa.code.tooMany" }
};

/** A refusal in the visitor's words: its code's message, else what the server said, else "could not send". */
export function visaRefusal(err: unknown, t: (key: string) => string) {
  const known =
    err instanceof ApiError && err.code ? VISA_ERRORS[err.code] : undefined;
  if (known) return t(known.key);
  return err instanceof ApiError && err.message && err.status
    ? err.message
    : t("visa.err.send");
}

/* ------------------------------------------------------------------ rules */

/** Every date here is a calendar day, "YYYY-MM-DD": compared as strings, done in UTC. */
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
const isoOf = (d: Date) => d.toISOString().slice(0, 10);

/** A calendar day as the site writes it ("12 juin 2027"), whatever this device's zone. */
export const visaDay = (
  iso: string | undefined,
  locale: Parameters<typeof fmtDate>[1]
) => (iso ? fmtDate(`${iso.slice(0, 10)}T12:00:00`, locale) : "");

/** Today on this device, as a calendar day. */
export const todayIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export function addDaysIso(iso: string, days: number) {
  const d = day(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return isoOf(d);
}

/** Calendar months; the 31st lands on the month's last day (31 Aug + 6 = 28 Feb). */
export function addMonthsIso(iso: string, months: number) {
  const d = day(iso);
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)
  );
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return isoOf(target);
}

/** Full years of age on a day. */
export function ageOn(dateOfBirth: string, on: string) {
  const [by, bm, bd] = dateOfBirth.slice(0, 10).split("-").map(Number);
  const [oy, om, od] = on.slice(0, 10).split("-").map(Number);
  return oy - by - (om < bm || (om === bm && od < bd) ? 1 : 0);
}

/** The last day the passport may expire on, or null when the country has no rule. */
export const passportNeededBy = (stayTo: string, months: number) =>
  stayTo && months > 0 ? addMonthsIso(stayTo, months) : null;

/** Leaving sooner than the visa usually takes: allowed, flagged to the office. */
export const isRush = (
  departureDate: string,
  processingDays: number,
  today: string
) =>
  Boolean(departureDate) && departureDate < addDaysIso(today, processingDays);

export const PURPOSE_MAX = 500;
export const ADDRESS_MAX = 300;

export interface VisaForm {
  countryId: string;
  townId: string;
  departureDate: string;
  returnDate: string;
  bookingReference: string;
  purpose: string;
  stayAddress: string;
  stayFrom: string;
  stayTo: string;
  offerId: string;
  personTypeId: string;
  invitationLetter: boolean;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  email: string;
}

export type VisaField = keyof VisaForm | "passportFile";

/** A problem: a message key (`visa.err.<code>`) and what goes into it. */
export interface VisaIssue {
  code: string;
  vars?: Record<string, string | number>;
}

const REQUIRED: (keyof VisaForm)[] = [
  "countryId",
  "townId",
  "departureDate",
  "returnDate",
  "purpose",
  "stayAddress",
  "stayFrom",
  "stayTo",
  "offerId",
  "personTypeId",
  "firstName",
  "lastName",
  "dateOfBirth",
  "nationality",
  "passportNumber",
  "passportExpiry"
];

/**
 * The server's rules, field by field. Dates are named in the issue (`vars`)
 * so the message can say which day would be right, not only that this one is not.
 */
export function checkVisaForm(
  f: VisaForm,
  ctx: {
    today: string;
    /** The chosen country's rule; 0 or absent: none. */
    passportValidityMonths?: number;
    /** The chosen person type is a minor's. */
    minor?: boolean;
    hasPassportFile: boolean;
  }
): Partial<Record<VisaField, VisaIssue>> {
  const out: Partial<Record<VisaField, VisaIssue>> = {};
  for (const k of REQUIRED) {
    if (!String(f[k] ?? "").trim()) out[k] = { code: "required" };
  }
  if (!ctx.hasPassportFile) out.passportFile = { code: "passportFile" };

  const { departureDate: dep, returnDate: ret, stayFrom, stayTo } = f;
  if (dep && dep < ctx.today)
    out.departureDate = { code: "departurePast", vars: { date: ctx.today } };
  if (dep && ret && ret < dep)
    out.returnDate = { code: "returnBeforeDeparture", vars: { date: dep } };
  if (stayFrom) {
    if (dep && stayFrom < dep)
      out.stayFrom = { code: "stayBeforeDeparture", vars: { date: dep } };
    else if (ret && stayFrom > ret)
      out.stayFrom = { code: "stayAfterReturn", vars: { date: ret } };
  }
  if (stayTo) {
    if (stayFrom && stayTo < stayFrom)
      out.stayTo = { code: "stayToBeforeFrom", vars: { date: stayFrom } };
    else if (ret && stayTo > ret)
      out.stayTo = { code: "stayAfterReturn", vars: { date: ret } };
    else if (dep && stayTo < dep)
      out.stayTo = { code: "stayBeforeDeparture", vars: { date: dep } };
  }

  const needed = passportNeededBy(stayTo, ctx.passportValidityMonths ?? 0);
  if (needed && f.passportExpiry && f.passportExpiry < needed) {
    out.passportExpiry = {
      code: "passportTooSoon",
      vars: { date: needed, months: ctx.passportValidityMonths ?? 0 }
    };
  }

  if (ctx.minor && f.dateOfBirth && dep && ageOn(f.dateOfBirth, dep) >= 18) {
    out.dateOfBirth = { code: "notMinor", vars: { date: dep } };
  }

  // As the server reads it: spaces and dashes dropped, 5 to 20 letters and digits.
  const passport = f.passportNumber.replace(/[\s-]/g, "").toUpperCase();
  if (passport && !/^[A-Z0-9]{5,20}$/.test(passport))
    out.passportNumber = { code: "passportNumber" };

  if (f.purpose.length > PURPOSE_MAX)
    out.purpose = { code: "tooLong", vars: { n: PURPOSE_MAX } };
  if (f.stayAddress.length > ADDRESS_MAX)
    out.stayAddress = { code: "tooLong", vars: { n: ADDRESS_MAX } };
  if (f.email.trim() && !isEmail(f.email.trim())) out.email = { code: "email" };
  return out;
}

/* ------------------------------------------------------------------ files */

export const VISA_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const VISA_FILES_PER_REQUEST = 5;
export const VISA_FILE_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp";

/** What the first bytes say a file is — the server sniffs the same way and ignores the name. */
export function sniffVisaFile(
  b: Uint8Array
): "pdf" | "jpeg" | "png" | "webp" | null {
  const at = (i: number, ...bytes: number[]) =>
    bytes.every((x, j) => b[i + j] === x);
  if (at(0, 0x25, 0x50, 0x44, 0x46)) return "pdf"; // %PDF
  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50))
    return "webp"; // RIFF….WEBP
  return null;
}

/** Why a file cannot be sent, or null. `head`: its first 12 bytes or more. */
export function checkVisaFile(
  size: number,
  head: Uint8Array
): "fileType" | "fileSize" | null {
  if (!sniffVisaFile(head)) return "fileType";
  if (size > VISA_FILE_MAX_BYTES) return "fileSize";
  return null;
}

/** "2,4 MB" — for the drop zone and its error. */
export const fileSizeLabel = (bytes: number, locale: string) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
