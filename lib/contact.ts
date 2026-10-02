import { getSiteContact, Office, SiteContact } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

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
 * if the API is unreachable.
 *
 * The phone/WhatsApp are deliberately blank: there is no real office number to
 * fall back to, and a fabricated one ("+243 81 000 00 00") shown to customers
 * is worse than none. Consumers hide the line when it is empty.
 */
const FALLBACK: SiteContact = {
  companyName: "Flexi Agency",
  email: "",
  phone: "",
  whatsapp: "",
  streetAddress: "12, avenue Colonel Lukusa, Gombe",
  city: "Kinshasa",
  country: "CD",
  officeHours: "",
  offices: []
};

/** Digits only, which is what `tel:` and `wa.me` both want. */
export const dial = (value: string) => value.replace(/[^\d+]/g, "");
export const waLink = (value: string) =>
  `https://wa.me/${value.replace(/\D/g, "")}`;

/** What one office is called where it is listed: its name, else its city. */
export const officeTitle = (o: Office) => o.name || o.city;

/**
 * The lines under an office's title, only the ones it has. The footer and the
 * contact page style them differently, so this is the content and nothing else.
 * The city joins the address only when the name is the title, or it would be
 * printed twice.
 */
/** Where a tap on the address goes: Google Maps at the office's own pin. */
export const mapsLink = (geo?: { lat: number; lng: number }) =>
  geo ? `https://www.google.com/maps?q=${geo.lat},${geo.lng}` : undefined;

export const officeLines = (o: Office) =>
  [
    {
      Icon: MapPin,
      // The address always shows; with a pin it is also the way there.
      text: [o.streetAddress, o.city].filter(Boolean).join(", "),
      href: mapsLink(o.geo),
      external: true
    },
    { Icon: Phone, text: o.phone, href: `tel:${dial(o.phone)}` },
    {
      Icon: MessageCircle,
      text: o.whatsapp && `WhatsApp — ${o.whatsapp}`,
      href: waLink(o.whatsapp),
      external: true
    },
    { Icon: Mail, text: o.email, href: `mailto:${o.email}` },
    { Icon: Clock, text: o.hours }
  ].filter((line) => line.text);

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
    officeHours: c.officeHours || FALLBACK.officeHours,
    offices: c.offices ?? []
  };
}
