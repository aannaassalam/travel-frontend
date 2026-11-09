import { usePrefs } from "@/lib/prefs";
import { Localized, Money } from "@/typescript/interface/domain.interface";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

/**
 * The restaurant cart.
 *
 * Separate from `lib/checkout` on purpose. That one models a travel booking:
 * one selection, dates, travellers, a stock hold with a countdown. A food order
 * is many lines from one kitchen with no dates and nothing held, and folding
 * the two into one shape would put a nights counter and a traveller list in a
 * flow that has neither.
 *
 * Held in sessionStorage for the same reason the checkout selection is: a
 * reload or a dropped connection on a metered 3G phone should not empty
 * somebody's basket. It does not survive a device switch — that needs the
 * server-side cart the guide asks for, which has no endpoint yet.
 *
 * ponytail: sessionStorage, not a server cart. Move to POST /api/v1/carts when
 * the endpoint lands — `persist()` is the only call site.
 *
 * Two baskets run on it: the restaurant one (`useCart`, one kitchen only) and
 * Duty Free's (`useDutyFreeCart`, several shops, each shop's fee once).
 */

/** What is added: a dish, or a Duty Free product. */
export interface CartItem {
  id: string;
  name: Localized;
  sellPrice: Money;
  images?: string[];
}

/** Who sells it: the restaurant, or the Duty Free shop. */
export interface CartShop {
  id: string;
  slug?: string;
  name: Localized | string;
  processingFee?: Money;
}

export interface CartLine {
  /** The dish's id, or the Duty Free product's. */
  menuItemId: string;
  /** Who sells it, and its processing fee (charged once per shop). */
  shopId?: string;
  shopName?: string;
  fee?: Money;
  name: string;
  /** Per-currency minor units, per single item. Snapshotted for display only —
   *  the server re-prices every line at checkout and its figure is the one
   *  charged, so a stale price here can never become a stale price paid. */
  unitPrice: Money;
  quantity: number;
  image?: string;
}

export interface CartState {
  /** A cart belongs to exactly one restaurant; see `add` below. */
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;
  lines: CartLine[];
}

const EMPTY: CartState = {
  restaurantId: null,
  restaurantSlug: null,
  restaurantName: null,
  lines: []
};

const MAX_LINES = 10; // The API refuses more than 10 lines on one order.
const MAX_QTY = 20; // …and more than 20 of any one line.

interface Ctx extends CartState {
  ready: boolean;
  count: number;
  /** Food subtotal only — delivery is added by the server at checkout. */
  subtotal: Money;
  add: (item: CartItem, shop: CartShop, quantity?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
  /** True when `add` was called for a different kitchen and is awaiting a
   *  decision — the UI asks before throwing away someone's basket. */
  pending: { item: CartItem; restaurant: CartShop } | null;
  confirmReplace: () => void;
  cancelReplace: () => void;
}
export type Cart = Ctx;

const CartContext = createContext<Ctx | null>(null);
const DutyFreeCartContext = createContext<Ctx | null>(null);

/** The restaurant basket: one kitchen at a time. */
export const CartProvider = ({ children }: { children: React.ReactNode }) => (
  <CartStore storageKey="ct.cart" oneShop Context={CartContext}>
    {children}
  </CartStore>
);

/** The Duty Free basket: products from several shops in one order. */
export const DutyFreeCartProvider = ({ children }: { children: React.ReactNode }) => (
  <CartStore storageKey="ct.dfcart" oneShop={false} Context={DutyFreeCartContext}>
    {children}
  </CartStore>
);

/** The line for `item` sold by `shop`, as kept in the basket (names in the visitor's language). */
const lineOf = (
  item: CartItem,
  shop: CartShop,
  quantity: number,
  lz: (f: Localized | string | undefined) => string
): CartLine => ({
  menuItemId: item.id,
  name: lz(item.name),
  unitPrice: item.sellPrice,
  quantity: Math.min(quantity, MAX_QTY),
  image: item.images?.[0],
  shopId: shop.id,
  shopName: lz(shop.name),
  fee: shop.processingFee
});

function CartStore({
  children,
  storageKey,
  oneShop,
  Context
}: {
  children: React.ReactNode;
  storageKey: string;
  /** Restaurants: adding from another kitchen asks to replace the basket. */
  oneShop: boolean;
  Context: React.Context<Ctx | null>;
}) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Ctx["pending"]>(null);
  // Names are kept as text in the basket: in the visitor's language when they add a dish.
  const { lz } = usePrefs();

  // Read after mount, never during render: the server has no sessionStorage,
  // and a first paint that disagrees with the server's is a hydration error.
  useEffect(() => {
    try {
      const saved: CartState | null = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      // A basket kept from before prices were in francs has no franc price: it
      // would total "0 FC" and never clear a zone's minimum, so it is dropped.
      if (saved?.lines?.every((l) => typeof l.unitPrice?.CDF === "number")) {
        setState({ ...EMPTY, ...saved });
      }
    } catch {
      /* corrupt or unavailable storage just means an empty cart */
    }
    setReady(true);
  }, [storageKey]);

  const persist = useCallback((next: CartState) => {
    setState(next);
    try {
      if (next.lines.length) sessionStorage.setItem(storageKey, JSON.stringify(next));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* a full or disabled store must not break the basket in memory */
    }
  }, [storageKey]);

  /**
   * One cart, one kitchen.
   *
   * The API refuses an order spanning two restaurants — there is one driver and
   * one delivery fee — so allowing the basket to mix would only produce a
   * failure at the last step, after the customer had chosen everything. Adding
   * from elsewhere raises `pending` instead, and the UI asks.
   *
   * Duty Free (`oneShop` false) takes several shops: the office collects from
   * each, and the order carries one delivery and each shop's fee once.
   */
  const add = useCallback(
    (item: CartItem, restaurant: CartShop, quantity = 1) => {
      if (oneShop && state.restaurantId && state.restaurantId !== restaurant.id) {
        setPending({ item, restaurant });
        return;
      }
      const existing = state.lines.find((l) => l.menuItemId === item.id);
      if (!existing && state.lines.length >= MAX_LINES) return;

      const lines = existing
        ? state.lines.map((l) =>
            l.menuItemId === item.id
              ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QTY) }
              : l
          )
        : [...state.lines, lineOf(item, restaurant, quantity, lz)];

      persist(
        oneShop
          ? {
              restaurantId: restaurant.id,
              restaurantSlug: restaurant.slug ?? null,
              restaurantName: lz(restaurant.name),
              lines
            }
          : { ...EMPTY, lines }
      );
    },
    [state, persist, lz, oneShop]
  );

  const setQuantity = useCallback(
    (menuItemId: string, quantity: number) => {
      const q = Math.max(0, Math.min(Math.trunc(quantity), MAX_QTY));
      // Zero removes rather than leaving a 0 line, which would post an invalid
      // quantity and be refused by the API.
      const lines =
        q === 0
          ? state.lines.filter((l) => l.menuItemId !== menuItemId)
          : state.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: q } : l));
      persist(lines.length ? { ...state, lines } : EMPTY);
    },
    [state, persist]
  );

  const remove = useCallback(
    (menuItemId: string) => setQuantity(menuItemId, 0),
    [setQuantity]
  );

  const clear = useCallback(() => persist(EMPTY), [persist]);

  const confirmReplace = useCallback(() => {
    if (!pending) return;
    const { item, restaurant } = pending;
    setPending(null);
    persist({
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug ?? null,
      restaurantName: lz(restaurant.name),
      lines: [lineOf(item, restaurant, 1, lz)]
    });
  }, [pending, persist, lz]);

  const cancelReplace = useCallback(() => setPending(null), []);

  const count = useMemo(
    () => state.lines.reduce((n, l) => n + l.quantity, 0),
    [state.lines]
  );

  /**
   * Subtotal per currency, kept only for the currencies every line has a real
   * typed price in. Summing a line that has no USD price into a USD subtotal
   * would invent a total the customer can never actually be charged, which is
   * the same rule the server applies when it decides what to settle in.
   */
  const subtotal = useMemo<Money>(() => {
    if (!state.lines.length) return { CDF: 0 };
    const currencies = (Object.keys(state.lines[0].unitPrice) as (keyof Money)[]).filter((c) =>
      state.lines.every((l) => typeof l.unitPrice[c] === "number")
    );
    const out: Money = {};
    for (const c of currencies) {
      out[c] = state.lines.reduce((sum, l) => sum + (l.unitPrice[c] ?? 0) * l.quantity, 0);
    }
    return Object.keys(out).length ? out : { CDF: 0 };
  }, [state.lines]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      count,
      subtotal,
      add,
      setQuantity,
      remove,
      clear,
      pending,
      confirmReplace,
      cancelReplace
    }),
    [state, ready, count, subtotal, add, setQuantity, remove, clear, pending, confirmReplace, cancelReplace]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function useDutyFreeCart(): Ctx {
  const ctx = useContext(DutyFreeCartContext);
  if (!ctx) throw new Error("useDutyFreeCart must be used inside <DutyFreeCartProvider>");
  return ctx;
}
