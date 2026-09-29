import {
  Currency,
  Money,
  Locale,
  Order,
  PaymentMethod,
  PaymentRail,
  Traveller,
  Vertical
} from "@/typescript/interface/domain.interface";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { multiply } from "./money";
import { rememberOrderRef } from "./store";
import { createOrder } from "./api";

/**
 * Checkout state.
 *
 * §11.3: "persist checkout state so a dropped connection resumes rather than
 * restarts". On a metered 3G connection that is not a nicety.
 *
 * ponytail: sessionStorage rather than the server-side cart the guide asks for,
 * because the cart endpoint does not exist yet. It survives a reload and a
 * dropped request on the same device, which is the case that actually bites;
 * it does not survive a device switch. Move to POST /api/v1/carts when the
 * endpoint lands — `persist()` below is the only call site.
 */

export interface CheckoutSelection {
  vertical: Vertical;
  listingSlug: string;
  listingId: string;
  label: string;
  sublabel?: string;
  image: string;
  /** Per-currency minor units, per unit per night/day/person. */
  unitPrice: Money;
  quantity: number;
  /** Nights for hotels, days for cars, 1 otherwise. */
  units: number;
  unitNoun: "night" | "day" | "person" | "unit";
  roomTypeId?: string;
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
  /** How many stock units remain — drives the honest scarcity line. */
  available: number;
}

export interface ContactDetails {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface CheckoutState {
  selection: CheckoutSelection | null;
  /** §4.5(4): 15 minutes online, 48 h for cash. ISO timestamp. */
  holdExpiresAt: string | null;
  travellers: Traveller[];
  contact: ContactDetails | null;
  consentAccepted: boolean;
  paymentMethod: PaymentMethod;
  paymentRail: PaymentRail;
  mobileOperator: string;
}

const EMPTY: CheckoutState = {
  selection: null,
  holdExpiresAt: null,
  travellers: [],
  contact: null,
  consentAccepted: false,
  paymentMethod: "ONLINE",
  paymentRail: "MOBILE_MONEY",
  mobileOperator: "M-Pesa"
};

/** §4.5(4). Minutes. */
export const HOLD_MINUTES_ONLINE = 15;
export const HOLD_HOURS_CASH = 48;

type Ctx = CheckoutState & {
  ready: boolean;
  start: (selection: CheckoutSelection) => void;
  update: (patch: Partial<CheckoutState>) => void;
  clear: () => void;
  subtotal: Money;
  total: Money;
  expired: boolean;
  confirm: (args: { currency: Currency; locale: Locale }) => Promise<Order>;
  /**
   * Abandons the current attempt and takes a fresh hold, keeping the basket.
   *
   * The idempotency key deliberately makes a retry REPLAY the original order
   * rather than book a second one (§4.6). The cost is that once that order is
   * cancelled — the hold ran out and the server released the seats — every
   * retry replays a dead order forever, and the customer cannot get out of it
   * without losing everything they picked. This mints a new attempt instead.
   */
  retryAttempt: () => void;
};

const KEY = "ct.checkout";
/** §4.6: survives a reload, so a retry cannot double-book. */
const IDEMPOTENCY_KEY = "ct.checkout.key";
const CheckoutContext = createContext<Ctx | null>(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CheckoutState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => 0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // One ticker for the whole checkout so the countdown, the expiry check and
  // the "sold out while you were typing" guard all read the same clock.
  useEffect(() => {
    if (!state.holdExpiresAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.holdExpiresAt]);

  const persist = useCallback((next: CheckoutState) => {
    setState(next);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(
    (selection: CheckoutSelection) => {
      /**
       * A new booking is a new attempt, so the idempotency key goes too.
       *
       * It only used to be dropped on the confirmation page, which a customer
       * whose payment failed never reached. Their next booking — a different
       * listing, a "fresh order" by any reasonable reading — then went up
       * under the old key, the server dutifully replayed the old, cancelled
       * order, and paying it returned 409 for no visible reason.
       */
      try {
        sessionStorage.removeItem(IDEMPOTENCY_KEY);
      } catch {
        /* ignore */
      }
      // §4.5(3): the hold is created when the customer enters checkout, not on
      // add-to-cart. Holding on browse would strand paid-for stock all day.
      persist({
        ...EMPTY,
        selection,
        holdExpiresAt: new Date(
          Date.now() + HOLD_MINUTES_ONLINE * 60_000
        ).toISOString(),
        travellers: Array.from(
          { length: Math.max(1, selection.adults ?? selection.quantity) },
          () => ({ firstName: "", lastName: "" })
        )
      });
    },
    [persist]
  );

  const update = useCallback(
    (patch: Partial<CheckoutState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        try {
          sessionStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => {
    setState(EMPTY);
    try {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(IDEMPOTENCY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /**
   * A new attempt at the same basket: drop the idempotency key so the next
   * `confirm()` creates a fresh order, and take a fresh hold so the countdown
   * and the disabled-on-expiry states reset with it.
   */
  const retryAttempt = useCallback(() => {
    try {
      sessionStorage.removeItem(IDEMPOTENCY_KEY);
    } catch {
      /* ignore */
    }
    update({
      holdExpiresAt: new Date(Date.now() + HOLD_MINUTES_ONLINE * 60_000).toISOString()
    });
  }, [update]);

  const sel = state.selection;
  // Every currency scales together, so the CDF total is the CDF unit price
  // times the quantity — never the USD total converted after the fact.
  // Memoised because `confirm()` closes over it.
  const subtotal: Money = useMemo(
    () => (sel ? multiply(sel.unitPrice, sel.quantity * sel.units) : { USD: 0 }),
    [sel]
  );
  /**
   * §17 Q1 (service fee / markup model) is still open with the client, so there
   * is deliberately no invented fee line. Sell price is the price. When the
   * answer arrives it is added here and in the summary component, never at the
   * payment step — §11.3 forbids revealing a fee at the last step.
   */
  const total: Money = subtotal;

  const expired = Boolean(
    state.holdExpiresAt && now > 0 && new Date(state.holdExpiresAt).getTime() < now
  );

  /**
   * Creates the order on the server.
   *
   * Everything that decides money or stock now happens in the API: the price is
   * re-read from the catalogue, the inventory hold is atomic, the consent text
   * is snapshotted from the published policy version, and the reference is
   * issued server-side. This function's whole job is to describe WHAT the
   * customer chose and hand it over.
   */
  const confirm = useCallback(
    async ({ currency, locale }: { currency: Currency; locale: Locale }): Promise<Order> => {
      if (!sel || !state.contact) {
        throw new Error("confirm() called before a selection and contact exist");
      }

      /**
       * §4.6: one key per checkout attempt, held in session storage so a retry
       * after a dropped response replays the original order rather than booking
       * a second one. Cleared by `clear()` when the checkout finishes.
       *
       * The currency is part of the attempt, not a detail of it. An order is
       * priced once and `chargedCurrency` is frozen on it, so replaying an old
       * key after the customer switched currency returned the original order —
       * still in the old currency — and they were charged in a currency they
       * had just changed away from. A different currency is a different order.
       */
      const KEY_CURRENCY = `${IDEMPOTENCY_KEY}.currency`;
      let key = sessionStorage.getItem(IDEMPOTENCY_KEY);
      if (key && sessionStorage.getItem(KEY_CURRENCY) !== currency) key = null;
      if (!key) {
        key = globalThis.crypto?.randomUUID?.() ?? `ck-${Date.now()}-${Math.random()}`;
        sessionStorage.setItem(IDEMPOTENCY_KEY, key);
      }
      sessionStorage.setItem(KEY_CURRENCY, currency);

      const order = await createOrder(
        {
          items: [
            {
              vertical: sel.vertical,
              listingId: sel.listingId,
              roomTypeId: sel.roomTypeId,
              startDate: sel.startDate,
              endDate: sel.endDate,
              quantity: sel.quantity
            }
          ],
          contact: {
            firstName: state.contact.firstName,
            lastName: state.contact.lastName,
            phone: state.contact.phone,
            email: state.contact.email
          },
          travellers: state.travellers.filter((t) => t.firstName || t.lastName),
          paymentMethod: state.paymentMethod === "CASH" ? "CASH" : "ONLINE",
          currency,
          locale
        },
        key
      );

      /**
       * Only the reference is kept locally; the order itself is re-read from
       * the API so the customer always sees what the office sees.
       *
       * Deliberately NO sign-in here. Buying something does not prove the phone
       * belongs to whoever typed it, so treating checkout as authentication
       * would hand out a session nobody verified — and would silently claim a
       * number that might be someone else's. An account is created only by
       * verifying a one-time code and choosing a password, which is what the
       * confirmation screen invites the customer to do once the booking is
       * safely filed.
       */
      rememberOrderRef(order.reference);
      return order;
    },
    [sel, state]
  );

  return (
    <CheckoutContext.Provider
      value={{
        ...state,
        ready,
        start,
        update,
        clear,
        subtotal,
        total,
        expired,
        confirm,
        retryAttempt
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout(): Ctx {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used inside <CheckoutProvider>");
  return ctx;
}

/** mm:ss left on the hold, or null once it is gone. */
export function useCountdown(iso: string | null): string | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) return setLeft(null);
    const tick = () => setLeft(new Date(iso).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  if (left == null || left <= 0) return null;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}
