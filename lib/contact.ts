import { getSiteContact, SiteContact } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

/**
 * The office's contact details, as the whole site should read them.
 *
 * They were hardcoded in the footer, the contact page and the homepage
 * structured data — three copies that could disagree, none of which the office
 * could change. This is the single reader.
 *
 * The fallbacks are not decoration: the footer renders on every page including
 * the first paint before this request lands, and an address that flickers in
 * is worse than one that is briefly a version behind. They are also what shows
 * if the API is unreachable, so the site never renders a contactless footer.
 */
const FALLBACK: SiteContact = {
  companyName: "Flexi Agency",
  email: "",
  phone: "+243 81 000 00 00",
  whatsapp: "+243 81 000 00 00",
  streetAddress: "12, avenue Colonel Lukusa, Gombe",
  city: "Kinshasa",
  country: "CD",
  officeHours: ""
};

/** Digits only, which is what `tel:` and `wa.me` both want. */
export const dial = (value: string) => value.replace(/[^\d+]/g, "");
export const waLink = (value: string) =>
  `https://wa.me/${value.replace(/\D/g, "")}`;

export function useSiteContact(): SiteContact {
  const { data } = useQuery({
    queryKey: ["site-contact"],
    queryFn: ({ signal }) => getSiteContact({ signal }),
    // Changes about once a year. Long stale time so it is fetched once per
    // session rather than on every page the footer mounts on.
    staleTime: 60 * 60_000,
    retry: 1
  });
  const c = data?.contact;
  if (!c) return FALLBACK;
  // Field-by-field, not a whole-object swap: a half-filled Settings document
  // would otherwise blank the footer rather than fall back per line.
  return {
    companyName: c.companyName || FALLBACK.companyName,
    email: c.email || FALLBACK.email,
    phone: c.phone || FALLBACK.phone,
    whatsapp: c.whatsapp || c.phone || FALLBACK.whatsapp,
    streetAddress: c.streetAddress || FALLBACK.streetAddress,
    city: c.city || FALLBACK.city,
    country: c.country || FALLBACK.country,
    officeHours: c.officeHours || FALLBACK.officeHours
  };
}
