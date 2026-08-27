import { Money, MenuItem, Restaurant } from "@/typescript/interface/domain.interface";
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
 */

export interface CartLine {
  menuItemId: string;
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

const KEY = "ct.cart";
const MAX_LINES = 10; // The API refuses more than 10 lines on one order.
const MAX_QTY = 20; // …and more than 20 of any one line.

interface Ctx extends CartState {
  ready: boolean;
  count: number;
  /** Food subtotal only — delivery is added by the server at checkout. */
  subtotal: Money;
  add: (item: MenuItem, restaurant: Restaurant, quantity?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
  /** True when `add` was called for a different kitchen and is awaiting a
   *  decision — the UI asks before throwing away someone's basket. */
  pending: { item: MenuItem; restaurant: Restaurant } | null;
  confirmReplace: () => void;
  cancelReplace: () => void;
}

const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Ctx["pending"]>(null);

  // Read after mount, never during render: the server has no sessionStorage,
  // and a first paint that disagrees with the server's is a hydration error.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* corrupt or unavailable storage just means an empty cart */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: CartState) => {
    setState(next);
    try {
      if (next.lines.length) sessionStorage.setItem(KEY, JSON.stringify(next));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* a full or disabled store must not break the basket in memory */
    }
  }, []);

  /**
   * One cart, one kitchen.
   *
   * The API refuses an order spanning two restaurants — there is one driver and
   * one delivery fee — so allowing the basket to mix would only produce a
   * failure at the last step, after the customer had chosen everything. Adding
   * from elsewhere raises `pending` instead, and the UI asks.
   */
  const add = useCallback(
    (item: MenuItem, restaurant: Restaurant, quantity = 1) => {
      if (state.restaurantId && state.restaurantId !== restaurant.id) {
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
        : [
            ...state.lines,
            {
              menuItemId: item.id,
              name: item.name.fr || item.name.en || "",
              unitPrice: item.sellPrice,
              quantity: Math.min(quantity, MAX_QTY),
              image: item.images?.[0]
            }
          ];

      persist({
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name.fr || restaurant.name.en || "",
        lines
      });
    },
    [state, persist]
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
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name.fr || restaurant.name.en || "",
      lines: [
        {
          menuItemId: item.id,
          name: item.name.fr || item.name.en || "",
          unitPrice: item.sellPrice,
          quantity: 1,
          image: item.images?.[0]
        }
      ]
    });
  }, [pending, persist]);

  const cancelReplace = useCallback(() => setPending(null), []);

  const count = useMemo(
    () => state.lines.reduce((n, l) => n + l.quantity, 0),
    [state.lines]
  );

  /**
   * Subtotal per currency, kept only for the currencies every line has a real
   * typed price in. Summing a line that has no CDF price into a CDF subtotal
   * would invent a total the customer can never actually be charged, which is
   * the same rule the server applies when it decides what to settle in.
   */
  const subtotal = useMemo<Money>(() => {
    if (!state.lines.length) return { USD: 0 };
    const currencies = (Object.keys(state.lines[0].unitPrice) as (keyof Money)[]).filter((c) =>
      state.lines.every((l) => typeof l.unitPrice[c] === "number")
    );
    const out: Money = {};
    for (const c of currencies) {
      out[c] = state.lines.reduce((sum, l) => sum + (l.unitPrice[c] ?? 0) * l.quantity, 0);
    }
    return Object.keys(out).length ? out : { USD: 0 };
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

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
