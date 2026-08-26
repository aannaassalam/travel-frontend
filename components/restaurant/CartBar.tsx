import { useCart } from "@/lib/cart";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

/**
 * The cart, as a bar that appears once there is something in it.
 *
 * A bar rather than a drawer or a badge in the header: on a phone the basket is
 * the only thing the customer is tracking while they scroll a menu, and a count
 * hidden behind a tap in the corner is a count nobody reads. It sits above the
 * fold of the thumb and says the two numbers that matter — how many, how much.
 *
 * Renders nothing when empty, so it never occupies space it has not earned.
 */
export default function CartBar() {
  const { locale, currency } = usePrefs();
  const { ready, count, subtotal, restaurantName, pending, confirmReplace, cancelReplace } =
    useCart();

  return (
    <>
      {/* Asked, never assumed: the API refuses an order spanning two kitchens,
          so adding from a second one has to replace the basket. Doing that
          silently would throw away a basket somebody had built. */}
      {pending && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cart-replace-title"
          className="fixed inset-0 z-50 grid place-items-center bg-brand-900/50 p-4"
        >
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-xl">
            <h2 id="cart-replace-title" className="text-lg font-bold text-brand-900">
              {locale === "fr" ? "Vider le panier ?" : "Start a new basket?"}
            </h2>
            <p className="mt-2 text-sm text-ink-700">
              {locale === "fr"
                ? `Votre panier contient des plats de ${restaurantName}. Une commande ne peut venir que d’un seul restaurant.`
                : `Your basket has food from ${restaurantName}. One order can only come from one restaurant.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={cancelReplace} className="btn btn-md btn-ghost">
                {locale === "fr" ? "Garder" : "Keep it"}
              </button>
              <button type="button" onClick={confirmReplace} className="btn btn-md btn-dark">
                {locale === "fr" ? "Vider et ajouter" : "Empty and add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* `ready` gates this: the cart is read from sessionStorage after mount,
          so rendering it during SSR would disagree with the first client paint
          and produce a hydration error. */}
      {ready && count > 0 && (
        <div className="motion-settle sticky bottom-0 z-30 border-t border-brand-900/10 bg-white/95 backdrop-blur-sm">
          <div className="container-site flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-900">{restaurantName}</p>
              <p className="text-sm text-ink-500">
                {count} {locale === "fr" ? (count > 1 ? "articles" : "article") : count > 1 ? "items" : "item"}
                {" · "}
                <span className="font-semibold text-ink-900">
                  {price(subtotal, currency, locale)}
                </span>
              </p>
            </div>
            <Link href="/restaurants/checkout" className="btn btn-md btn-accent shrink-0">
              <ShoppingBag className="size-4" />
              {locale === "fr" ? "Commander" : "Checkout"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
