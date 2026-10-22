/**
 * Domain vocabulary, mirrored 1:1 from travel-backend
 * `src/constants/domain.constants.ts` and the Mongoose models.
 *
 * Nothing here is invented for the frontend. When the public `/api/v1`
 * catalogue endpoints land, the shapes below are what they must return, so
 * `lib/catalog.ts` swaps its local dataset for axios and nothing else changes.
 */

export const VERTICALS = {
  FLIGHT: "FLIGHT",
  BUS: "BUS",
  CAR: "CAR",
  HOTEL: "HOTEL",
  ACTIVITY: "ACTIVITY",
  PROPERTY: "PROPERTY",
  RESTAURANT: "RESTAURANT"
} as const;
export type Vertical = (typeof VERTICALS)[keyof typeof VERTICALS];

// Mirrors the API. The public endpoints only ever return PUBLISHED and
// SOLD_OUT; the rest are listed so the type matches the server's.
export const LISTING_STATUS = {
  INACTIVE: "INACTIVE",
  PUBLISHED: "PUBLISHED",
  EXPIRED: "EXPIRED",
  SOLD_OUT: "SOLD_OUT",
  ARCHIVED: "ARCHIVED"
} as const;
export type ListingStatus =
  (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

export const BASE_CURRENCY = "USD";
export const CURRENCIES = ["USD", "CDF", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ORDER_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED"
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  UNPAID: "UNPAID",
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REVERSED: "REVERSED"
} as const;
export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const FULFILMENT_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  DOCUMENTS_PENDING: "DOCUMENTS_PENDING",
  DOCUMENTS_ISSUED: "DOCUMENTS_ISSUED",
  DELIVERED: "DELIVERED"
} as const;
export type FulfilmentStatus =
  (typeof FULFILMENT_STATUS)[keyof typeof FULFILMENT_STATUS];

export const PAYMENT_METHOD = {
  ONLINE: "ONLINE",
  CASH: "CASH"
} as const;
export type PaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

/*
 * How the money moves is one of those two and no finer: an online payment is
 * made on MaxiCash's own page, where the customer — not this site — chooses
 * card, mobile money or a MaxiCash wallet. Whether online can be offered at
 * all is the server's to say (`useOnlinePayment` in lib/payments.ts); this
 * site carries no switch of its own.
 */

export const MEAL_PLANS = {
  ROOM_ONLY: "ROOM_ONLY",
  BREAKFAST: "BREAKFAST",
  HALF_BOARD: "HALF_BOARD",
  FULL_BOARD: "FULL_BOARD",
  ALL_INCLUSIVE: "ALL_INCLUSIVE"
} as const;
export type MealPlan = (typeof MEAL_PLANS)[keyof typeof MEAL_PLANS];

export const LOCALES = ["fr", "en", "pt", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
/** §6: pt/es stay scaffolded behind this flag — half-translated reads as untrustworthy. */
export const ENABLED_LOCALES: Locale[] = ["fr", "en"];

export const ENQUIRY_STAGES = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  QUOTED: "QUOTED",
  WON: "WON",
  LOST: "LOST"
} as const;
export type EnquiryStage =
  (typeof ENQUIRY_STAGES)[keyof typeof ENQUIRY_STAGES];

export const ENQUIRY_KINDS = {
  PROPERTY: "PROPERTY",
  REQUEST_TO_BOOK: "REQUEST_TO_BOOK"
} as const;
export type EnquiryKind = (typeof ENQUIRY_KINDS)[keyof typeof ENQUIRY_KINDS];

/** §1.1 — three flows, not eleven. Every vertical resolves to one archetype. */
export const ARCHETYPE: Record<Vertical, "INSTANT" | "REQUEST" | "ENQUIRY"> = {
  FLIGHT: "INSTANT",
  BUS: "INSTANT",
  CAR: "INSTANT",
  HOTEL: "INSTANT",
  ACTIVITY: "INSTANT",
  PROPERTY: "ENQUIRY",
  // Food is bought outright like a seat, not requested like a property.
  RESTAURANT: "INSTANT"
};

export type Localized = Partial<Record<Locale, string>>;

/**
 * Prices, per currency, in integer minor units — mirroring the backend Money
 * field. The office enters USD only; the API works out CDF and EUR from its
 * exchange rates and sends all three, so what is shown is what is charged.
 * A currency with no rate set is simply absent.
 */
export type Money = Partial<Record<Currency, number>>;

/** One flight of a route's week: 0 = Sunday … 6 = Saturday, "HH:MM". */
export interface WeeklyTime {
  day: number;
  time: string;
}

export interface ListingAttributes {
  // Bus and flight routes: from the listing's `city` to `destination`, run by
  // `operator` (the travel agency). A bus leaves at `dailyTimes` every day; a
  // flight at `weeklyTimes`. The customer picks the date and the time.
  destination?: string;
  operator?: string;
  dailyTimes?: string[];
  weeklyTimes?: WeeklyTime[];
  // Flights
  cabin?: "ECONOMY" | "PREMIUM" | "BUSINESS" | "FIRST";
  baggage?: string;
  fareRules?: string;
  // Bus
  routeStops?: string[];
  vehicleClass?: string;
  // Cars
  make?: string;
  model?: string;
  year?: number;
  category?: string;
  transmission?: "MANUAL" | "AUTOMATIC";
  withDriver?: boolean;
  deposit?: number;
  mileageLimit?: string;
  pickupLocations?: string[];
  insuranceTerms?: string;
  // Activities
  durationMinutes?: number;
  minParticipants?: number;
  maxParticipants?: number;
  inclusions?: string[];
  exclusions?: string[];
  meetingPoint?: string;
  languages?: string[];
  childPrice?: number;
  // Properties
  propertyType?:
    | "HOUSE_SALE"
    | "LAND_SALE"
    | "APARTMENT_RENT"
    | "HOUSE_RENT"
    | "LAND_RENT";
  priceBasis?: "TOTAL" | "PER_MONTH";
  areaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  plotSizeSqm?: number;
  features?: string[];
  titleDeedStatus?: string;
  availabilityStatus?: "AVAILABLE" | "UNDER_OFFER" | "SOLD" | "RENTED";
  // Shared
  seatsOrCapacity?: number;
  departsAt?: string;
  arrivesAt?: string;
}

/**
 * Public projection of `IListing`. §10.3(3): `costPrice`, `supplier` and
 * internal notes are absent by construction — this type has no field for them,
 * so a component cannot render one by accident.
 */
export interface Listing {
  id: string;
  vertical: Vertical;
  title: Localized;
  slug: string;
  description: Localized;
  status: ListingStatus;
  city: string;
  country: string;
  geo?: { lat: number; lng: number };
  images: string[];
  /** The optional video: the stored address of the uploaded file (see lib/media.ts). */
  videoUrl?: string;
  /** Per-currency minor units. For a bus or flight, the adult fare (12+). */
  sellPrice: Money;
  /** Bus and flight fares for a child of 2 to 12 and a baby under 2. */
  childPrice?: Money;
  infantPrice?: Money;
  /**
   * quantityTotal − sold − held, computed server-side. Absent for a bus or
   * flight route: its seats are not counted.
   */
  available?: number;
  validFrom?: string;
  validUntil?: string;
  attributes: ListingAttributes;
  rating?: number;
  reviewCount?: number;
}

export interface Hotel {
  id: string;
  name: Localized;
  slug: string;
  description: Localized;
  stars: number;
  address: string;
  city: string;
  country: string;
  geo?: { lat: number; lng: number };
  amenities: string[];
  images: string[];
  /** The optional video: the stored address of the uploaded file (see lib/media.ts). */
  videoUrl?: string;
  checkInTime: string;
  checkOutTime: string;
  policies: string;
  rating?: number;
  reviewCount?: number;
  /** Cheapest nightly price across room types, per currency. */
  fromPrice: Money;
  roomTypes: RoomType[];
}

export interface RoomType {
  id: string;
  hotelId: string;
  name: Localized;
  description: Localized;
  maxAdults: number;
  maxChildren: number;
  beds: string;
  amenities: string[];
  images: string[];
  mealPlan: MealPlan;
  /** Nightly price, per currency — the same every night. Rooms are not counted. */
  sellPrice: Money;
  sizeSqm?: number;
}

/** Bus and flight seats by fare. */
export interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

/** Flights: what the customer declared they will carry, in kg. */
export interface Baggage {
  cabinKg: number;
  checkedKg: number;
}

export interface OrderItem {
  vertical: Vertical;
  listingId: string;
  listingLabel: string;
  roomTypeId?: string;
  startDate?: string;
  endDate?: string;
  /** A bus or flight: the time of the departure chosen, "HH:MM". */
  departureTime?: string;
  origin?: string;
  destination?: string;
  passengers?: Passengers;
  baggage?: Baggage;
  quantity: number;
  unitSellPrice: Money;
  lineTotal: Money;
}

export interface Traveller {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  documentType?: "PASSPORT" | "ID" | "OTHER";
  /** §10.5: masked on read. The full value never reaches a public response. */
  documentNumberMasked?: string;
  nationality?: string;
}

/** §2.2(2) — the evidence that defends a chargeback. */
export interface OrderConsent {
  policyVersionLabel: string;
  textShown: string;
  locale: Locale;
  acceptedAt: string;
}

export interface OrderTimelineEntry {
  at: string;
  event: string;
  detail?: string;
}

export interface OrderDelivery {
  address: string;
  zoneName?: string;
  /** Minor units, USD base — and in the currency actually charged. */
  fee: number;
  feeCharged: number;
  etaMinutes?: number;
  notes?: string;
}

export interface Order {
  /** Restaurant orders only. */
  delivery?: OrderDelivery;
  /** §10.3(4) unguessable — never a sequential integer. */
  reference: string;
  /** Last four digits of the booking phone, for the confirmation line. */
  contactPhoneMasked?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  items: OrderItem[];
  travellers: Traveller[];
  /** Per-currency minor units. */
  total: Money;
  chargedCurrency: Currency;
  chargedTotal: number;
  fxRate: number;
  paymentMethod: PaymentMethod;
  /** Back from MaxiCash's page by its "paid" address, its confirmation awaited. */
  paymentAwaited?: boolean;
  cashDeadline?: string;
  cashReference?: string;
  consent?: OrderConsent;
  /** The current version of each kind. No URL: a link is minted per download. */
  documents: {
    id: string;
    kind: "ETICKET" | "VOUCHER" | "INVOICE";
    fileName: string;
    issuedAt?: string;
  }[];
  timeline: OrderTimelineEntry[];
  travelDate?: string;
  createdAt: string;
}

export interface Enquiry {
  reference: string;
  kind: EnquiryKind;
  stage: EnquiryStage;
  vertical: Vertical;
  customerName: string;
  phone: string;
  email?: string;
  message: string;
  listingLabel?: string;
  quotedAmount?: Money;
  quoteExpiresAt?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------

/** Mirrors MENU_SECTIONS in the backend, in the order a menu is read. */
export const MENU_SECTIONS = {
  STARTER: "STARTER",
  MAIN: "MAIN",
  SIDE: "SIDE",
  DESSERT: "DESSERT",
  DRINK: "DRINK"
} as const;
export type MenuSection = (typeof MENU_SECTIONS)[keyof typeof MENU_SECTIONS];

export interface DeliveryZone {
  id: string;
  name: string;
  /** Per-currency minor units, added to the order total. */
  fee: Money;
  /** Food subtotal the order must reach before this zone is offered. */
  minOrder?: Money;
  etaMinutes: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  section: MenuSection;
  name: Localized;
  description: Localized;
  sellPrice: Money;
  images: string[];
  /** False means 86'd today: shown, greyed, not orderable. */
  isAvailable: boolean;
  sortOrder: number;
}

export interface Restaurant {
  id: string;
  name: Localized;
  slug: string;
  description: Localized;
  cuisines: string[];
  address: string;
  city: string;
  country: string;
  geo?: { lat: number; lng: number };
  images: string[];
  /** The optional video: the stored address of the uploaded file (see lib/media.ts). */
  videoUrl?: string;
  openingHours: string;
  /** Minutes in the kitchen, before any travel time. */
  prepTimeMinutes: number;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  deliveryZones: DeliveryZone[];
  /** Cheapest available dish, per currency. */
  fromPrice: Money;
  /** Present on the detail endpoint only. */
  menu?: MenuItem[];
}
