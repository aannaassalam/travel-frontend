import { useCart } from "@/lib/cart";
import { multiply, price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { ChevronUp, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

/**
 * The cart, as a bar that appears once there is something in it.
 *
 * A bar rather than a drawer or a header badge: on a phone the basket is the
 * only thing the customer tracks while scrolling a menu, and a count hidden
 * behind a tap in the corner is a count nobody reads. It sits in reach of the
 * thumb and says the two numbers that matter — how many, how much.
 *
 * The chevron opens the lines. "Two items, $15" is enough while you are still
 * choosing, but not enough to commit on — the moment before checkout is exactly
 * when someone wants to see WHAT the two items are, and finding that out by
 * scrolling back through the menu is the point where an order gets abandoned.
 *
 * Renders nothing when empty, so it never occupies space it has not earned.
 */
export default function CartBar() {
  const { locale, currency } = usePrefs();
  const {
    ready,
    lines,
    count,
    subtotal,
    restaurantName,
    setQuantity,
    remove,
    pending,
    confirmReplace,
    cancelReplace
  } = useCart();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Escape closes it, the way every other overlay on the site does.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // An emptied basket must not leave an open panel behind with nothing in it.
  useEffect(() => {
    if (!count) setOpen(false);
  }, [count]);

  const itemWord = locale === "fr" ? (count > 1 ? "articles" : "article") : count > 1 ? "items" : "item";

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
              <button type="button" onClick={cancelReplace} className="btn btn-md btn-outline">
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
        <>
          {/* Tapping away closes the panel. Rendered only when open so it never
              swallows clicks on the menu underneath. */}
          {open && (
            <div
              className="fixed inset-0 z-20 bg-brand-900/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}

          <div className="motion-settle sticky bottom-0 z-30 border-t border-brand-900/10 bg-white/95 backdrop-blur-sm">
            {/* The lines. Collapsed with max-height rather than unmounted so the
                open and close both animate, and the list keeps its scroll. */}
            <div
              id={panelId}
              className={cn(
                "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
                open ? "max-h-[min(60vh,26rem)] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="container-site max-h-[min(60vh,26rem)] overflow-y-auto py-3">
                <ul className="divide-y divide-ink-100">
                  {lines.map((l) => (
                    <li key={l.menuItemId} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{l.name}</p>
                        <p className="text-xs text-ink-500">
                          {price(l.unitPrice, currency, locale)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 rounded-lg bg-brand-50 p-0.5 ring-1 ring-brand-100 ring-inset">
                        <button
                          type="button"
                          onClick={() => setQuantity(l.menuItemId, l.quantity - 1)}
                          aria-label={locale === "fr" ? `Retirer un ${l.name}` : `Remove one ${l.name}`}
                          className="grid size-7 place-items-center rounded-md text-brand-900 transition-colors hover:bg-white"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="tnum w-5 text-center text-sm font-bold text-brand-900">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(l.menuItemId, l.quantity + 1)}
                          aria-label={locale === "fr" ? `Ajouter un ${l.name}` : `Add one ${l.name}`}
                          className="grid size-7 place-items-center rounded-md text-brand-900 transition-colors hover:bg-white"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      {/* The line total, not the unit price — this is the number
                          people are actually adding up in their head. */}
                      <span className="tnum w-20 shrink-0 text-right text-sm font-bold text-brand-900">
                        {price(multiply(l.unitPrice, l.quantity), currency, locale)}
                      </span>

                      <button
                        type="button"
                        onClick={() => remove(l.menuItemId)}
                        aria-label={locale === "fr" ? `Retirer ${l.name}` : `Remove ${l.name}`}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-bad-100 hover:text-bad-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="pt-3 text-xs text-ink-500">
                  {locale === "fr"
                    ? "Les frais de livraison sont ajoutés au paiement, selon votre zone."
                    : "Delivery is added at checkout, based on your zone."}
                </p>
              </div>
            </div>

            <div className="container-site flex items-center justify-between gap-3 py-3">
              {/* The whole summary is the toggle, not just the chevron — a 16px
                  arrow is a poor target on a phone. */}
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls={panelId}
                className="-m-2 flex min-w-0 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-ink-50"
              >
                <ChevronUp
                  className={cn(
                    "size-5 shrink-0 text-brand-700 transition-transform duration-300",
                    open && "rotate-180"
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-brand-900">
                    {restaurantName}
                  </span>
                  <span className="block text-sm text-ink-500">
                    {count} {itemWord} ·{" "}
                    <span className="font-semibold text-ink-900">
                      {price(subtotal, currency, locale)}
                    </span>
                  </span>
                </span>
              </button>

              <Link href="/restaurants/checkout" className="btn btn-md btn-primary shrink-0">
                <ShoppingBag className="size-4" />
                {locale === "fr" ? "Commander" : "Checkout"}
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
