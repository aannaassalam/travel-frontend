import { Localized, Money, Promotion } from "@/typescript/interface/domain.interface";
import { get, Paged } from "./api";
import { addMoney, baseMinor } from "./money";

/**
 * Duty Free: products from the office's partner shops, browsed by category —
 * never by shop — and delivered to one of the office's points.
 *
 * Mirrors travel-backend's public `/duty-free/*` routes. Nothing is priced
 * here for good: the order is priced again on the server (`priceDutyFreeProduct`),
 * and the figures below are the customer's arithmetic before they commit.
 */

/* --------------------------------------------------------------------- types */

export interface DutyFreeCategory {
  id: string;
  name: Localized;
  slug: string;
  /** The tile's cover photo, as stored (lib/media.ts). */
  image?: string;
  /** Live products in it. */
  productCount?: number;
}

/** The shop a product is sold by: on its card ("Sold by …") and for the fee. */
export interface DutyFreeShopRef {
  id: string;
  name: Localized | string;
  city?: string;
  /** Once per order for this shop, whatever the products; absent when 0. */
  processingFee?: Money;
}

export interface DutyFreeProduct {
  id: string;
  name: Localized;
  description: Localized;
  sellPrice: Money;
  promotion?: Promotion;
  images: string[];
  videoUrl?: string;
  /** False: shown greyed, not orderable. */
  isAvailable: boolean;
  shop: DutyFreeShopRef;
}

export type DeliveryPointKind = "OFFICE" | "AIRPORT" | "BUS_TERMINAL" | "HOTEL" | "RESTAURANT" | "OTHER";

export interface DeliveryPoint {
  id: string;
  name: Localized | string;
  /** Blank: serves every town. */
  city?: string;
  kind: DeliveryPointKind;
  /** The office's own address, for OFFICE. */
  address?: string;
  /** Absent when free. For OTHER, the one cost whatever the address. */
  fee?: Money;
  etaMinutes?: number;
  /** Every kind but OFFICE: the customer types which terminal, hotel or address. */
  needsAddress: boolean;
}

/* ----------------------------------------------------------------------- api */

const query = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
};

/** GET /duty-free/categories — those with at least one live product. */
export const getDutyFreeCategories = (init?: RequestInit) =>
  get<{ items?: DutyFreeCategory[]; categories?: DutyFreeCategory[] }>("/duty-free/categories", init).then(
    (r) => r.items ?? r.categories ?? []
  );

/** GET /duty-free/products — a category's products across every shop in it; `ids` refreshes a basket. */
export const searchDutyFreeProducts = (
  q: { category?: string; q?: string; promo?: boolean; ids?: string; page?: number; limit?: number },
  init?: RequestInit
) => get<Paged<DutyFreeProduct>>(`/duty-free/products${query(q)}`, init);

/**
 * GET /duty-free/points?shops= — the active points of the basket's shops'
 * towns (and those with no town); every point when the towns have none.
 */
export const getDutyFreePoints = (shops: string[], init?: RequestInit) =>
  get<{ items?: DeliveryPoint[]; points?: DeliveryPoint[] }>(`/duty-free/points${query({ shops: shops.join(",") })}`, init).then(
    (r) => (r.items ?? r.points ?? []).map((p) => ({ ...p, needsAddress: p.needsAddress ?? p.kind !== "OFFICE" }))
  );

/* ------------------------------------------------------------------- helpers */

/** What a basket line needs for the totals: its price, how many, its shop and the shop's fee. */
export interface FeeLine {
  unitPrice: Money;
  quantity: number;
  shopId?: string;
  fee?: Money;
}

/**
 * Subtotal, then the point's fee, then each shop's processing fee ONCE —
 * whatever the products and quantities from it (the server keys the fee on
 * the shop). Only the currencies every part carries, as the server settles.
 */
export function dutyFreeTotals(lines: FeeLine[], pointFee?: Money) {
  const currencies = (Object.keys(lines[0]?.unitPrice ?? {}) as (keyof Money)[]).filter((c) =>
    lines.every((l) => typeof l.unitPrice[c] === "number")
  );
  const subtotal: Money = currencies.length ? {} : { CDF: 0 };
  for (const c of currencies) subtotal[c] = lines.reduce((n, l) => n + l.unitPrice[c]! * l.quantity, 0);

  const perShop = new Map<string, Money>();
  for (const l of lines) if (l.shopId && baseMinor(l.fee) > 0) perShop.set(l.shopId, l.fee!);
  let fees: Money | undefined;
  for (const f of perShop.values()) fees = fees ? addMoney(fees, f) : f;
  return { subtotal, fees, total: addMoney(addMoney(subtotal, pointFee), fees) };
}
