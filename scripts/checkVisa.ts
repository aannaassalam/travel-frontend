/**
 * The E-Visa form's rules, as lib/visa.ts mirrors the server's. Fails loudly
 * if one drifts. No browser, no API:
 *
 *   npx jiti scripts/checkVisa.ts
 */
import assert from "node:assert/strict";
import {
  addMonthsIso,
  ageOn,
  checkVisaFile,
  checkVisaForm,
  isRush,
  passportNeededBy,
  sniffVisaFile,
  VISA_ERRORS,
  VISA_FILE_MAX_BYTES,
  type VisaForm
} from "../lib/visa";
import { visaMessages } from "../lib/messages/visa";

const today = "2026-11-06";
const ok: VisaForm = {
  countryId: "c",
  townId: "t",
  departureDate: "2026-12-10",
  returnDate: "2026-12-24",
  bookingReference: "",
  purpose: "Visiting family",
  stayAddress: "12 rue de Lyon, Paris",
  stayFrom: "2026-12-10",
  stayTo: "2026-12-24",
  offerId: "o",
  personTypeId: "p",
  invitationLetter: false,
  firstName: "Marie",
  lastName: "Kabila",
  dateOfBirth: "1990-04-02",
  nationality: "CD",
  passportNumber: "OP1234567",
  passportExpiry: "2027-12-01",
  email: ""
};
const ctx = { today, passportValidityMonths: 6, hasPassportFile: true };
const check = (
  patch: Partial<VisaForm>,
  more: Partial<typeof ctx> & { minor?: boolean } = {}
) => checkVisaForm({ ...ok, ...patch }, { ...ctx, ...more });

// A complete, valid form passes.
assert.deepEqual(check({}), {});

// Required fields and the passport file.
assert.equal(check({ purpose: "  " }).purpose?.code, "required");
assert.equal(
  check({}, { hasPassportFile: false }).passportFile?.code,
  "passportFile"
);

// Dates: departure ≥ today · return ≥ departure · departure ≤ stayFrom ≤ stayTo ≤ return.
assert.equal(
  check({ departureDate: "2026-11-05" }).departureDate?.code,
  "departurePast"
);
assert.equal(
  check({ departureDate: today, stayFrom: today }).departureDate,
  undefined
);
assert.equal(
  check({ returnDate: "2026-12-09" }).returnDate?.code,
  "returnBeforeDeparture"
);
assert.equal(
  check({ stayFrom: "2026-12-09" }).stayFrom?.code,
  "stayBeforeDeparture"
);
assert.equal(
  check({ stayFrom: "2026-12-25" }).stayFrom?.code,
  "stayAfterReturn"
);
assert.equal(
  check({ stayFrom: "2026-12-20", stayTo: "2026-12-15" }).stayTo?.code,
  "stayToBeforeFrom"
);
assert.equal(check({ stayTo: "2026-12-25" }).stayTo?.code, "stayAfterReturn");
assert.deepEqual(check({ stayFrom: "2026-12-12", stayTo: "2026-12-20" }), {});

// Passport validity: stayTo + the country's months, named in the error; 0 = no rule.
assert.equal(passportNeededBy("2026-12-24", 6), "2027-06-24");
assert.equal(passportNeededBy("2026-12-24", 0), null);
assert.deepEqual(check({ passportExpiry: "2027-06-23" }).passportExpiry, {
  code: "passportTooSoon",
  vars: { date: "2027-06-24", months: 6 }
});
assert.equal(check({ passportExpiry: "2027-06-24" }).passportExpiry, undefined);
assert.equal(
  check({ passportExpiry: "2027-01-01" }, { passportValidityMonths: 0 })
    .passportExpiry,
  undefined
);
assert.equal(addMonthsIso("2026-08-31", 6), "2027-02-28");
assert.equal(addMonthsIso("2027-08-31", 6), "2028-02-29");

// Minor: under 18 on the day of departure.
assert.equal(ageOn("2008-12-10", "2026-12-10"), 18);
assert.equal(ageOn("2008-12-11", "2026-12-10"), 17);
assert.equal(
  check({ dateOfBirth: "2008-12-10" }, { minor: true }).dateOfBirth?.code,
  "notMinor"
);
assert.equal(
  check({ dateOfBirth: "2008-12-11" }, { minor: true }).dateOfBirth,
  undefined
);
assert.equal(check({ dateOfBirth: "2008-12-10" }).dateOfBirth, undefined);

// Rush: departure sooner than today + processing days. Allowed, only flagged.
assert.equal(isRush("2026-11-15", 10, today), true);
assert.equal(isRush("2026-11-16", 10, today), false);

// The passport number as the server reads it.
assert.equal(
  check({ passportNumber: "OP-12" }).passportNumber?.code,
  "passportNumber"
);
assert.equal(
  check({ passportNumber: "OP12345/" }).passportNumber?.code,
  "passportNumber"
);
assert.equal(
  check({ passportNumber: "op 1234-567" }).passportNumber,
  undefined
);

// Lengths and the optional e-mail.
assert.equal(check({ purpose: "x".repeat(501) }).purpose?.code, "tooLong");
assert.equal(
  check({ stayAddress: "x".repeat(301) }).stayAddress?.code,
  "tooLong"
);
assert.equal(check({ email: "nope" }).email?.code, "email");
assert.equal(check({ email: "a@b.cd" }).email, undefined);

// Files: by their bytes, not their name; 10 MB at most.
const bytes = (...b: number[]) => Uint8Array.from([...b, ...Array(12).fill(0)]);
assert.equal(sniffVisaFile(bytes(0x25, 0x50, 0x44, 0x46, 0x2d)), "pdf");
assert.equal(sniffVisaFile(bytes(0xff, 0xd8, 0xff, 0xe0)), "jpeg");
assert.equal(
  sniffVisaFile(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
  "png"
);
assert.equal(
  sniffVisaFile(
    Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50
    ])
  ),
  "webp"
);
const html = new TextEncoder().encode("<!doctype html><p>not a pdf</p>");
assert.equal(checkVisaFile(100, html), "fileType");
assert.equal(
  checkVisaFile(VISA_FILE_MAX_BYTES + 1, bytes(0x25, 0x50, 0x44, 0x46)),
  "fileSize"
);
assert.equal(
  checkVisaFile(VISA_FILE_MAX_BYTES, bytes(0x25, 0x50, 0x44, 0x46)),
  null
);

// Every key in all 7 languages, and every error code has a message.
const fr = Object.keys(visaMessages.fr).sort();
for (const [lang, dict] of Object.entries(visaMessages)) {
  assert.deepEqual(
    Object.keys(dict).sort(),
    fr,
    `${lang}: keys differ from fr`
  );
  for (const [k, v] of Object.entries(dict))
    assert.ok(v.trim(), `${lang}: ${k} is empty`);
}
for (const code of [
  "required",
  "passportFile",
  "departurePast",
  "returnBeforeDeparture",
  "stayBeforeDeparture",
  "stayAfterReturn",
  "stayToBeforeFrom",
  "passportTooSoon",
  "notMinor",
  "passportNumber",
  "bookingNotFound",
  "choiceUnavailable",
  "tooLong",
  "email",
  "fileType",
  "fileSize"
]) {
  assert.ok(`visa.err.${code}` in visaMessages.fr, `missing visa.err.${code}`);
}

// Every server refusal code, and every missing answer, has its own message.
for (const [code, { key }] of Object.entries(VISA_ERRORS))
  assert.ok(key in visaMessages.fr, `${code}: no ${key}`);
const blank = Object.fromEntries(
  Object.entries(ok).map(([k, v]) => [k, typeof v === "string" ? "" : v])
) as VisaForm;
for (const [field, issue] of Object.entries(
  checkVisaForm(blank, { ...ctx, hasPassportFile: false })
)) {
  if (issue?.code === "required")
    assert.ok(
      `visa.req.${field}` in visaMessages.fr,
      `missing visa.req.${field}`
    );
}

console.log("checkVisa: all rules hold");
