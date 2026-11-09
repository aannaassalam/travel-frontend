import Gallery from "@/components/catalog/Gallery";
import ListingVideo from "@/components/catalog/ListingVideo";
import CartBar from "@/components/restaurant/CartBar";
import { Price, PromoEnds, PromoWas } from "@/components/site/bits";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDutyFreeCart } from "@/lib/cart";
import type { DutyFreeProduct } from "@/lib/dutyFree";
import { mediaUrl } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Images, Minus, Play, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

/** The dark opening every section page has (as /vehicles): eyebrow, title, one line. */
export function DutyFreeBanner({ title, lead }: { title: string; lead: string }) {
  const { t } = usePrefs();
  return (
    <div className="bg-brand-900 text-white">
      <div className="container-site py-10 sm:py-14">
        <p className="eyebrow mb-3 flex items-center gap-2 text-accent-500">
          <ShoppingBag className="size-4" aria-hidden="true" />
          {t("nav.dutyFree")}
        </p>
        <h1 className="display max-w-2xl text-[30px] leading-tight sm:text-[40px]">{title}</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">{lead}</p>
      </div>
    </div>
  );
}

/** The Duty Free basket's bar, at the foot of the pages that add to it. */
export function DutyFreeCartBar() {
  const { t } = usePrefs();
  return (
    <CartBar
      useCartState={useDutyFreeCart}
      href="/duty-free/checkout"
      title={t("nav.dutyFree")}
      note={t("pg.dutyFree.cartNote")}
    />
  );
}

/** Add, or − n +, for one product; "Out of stock" when the shop has none. */
function Quantity({ product }: { product: DutyFreeProduct }) {
  const { t } = usePrefs();
  const { lines, add, setQuantity } = useDutyFreeCart();
  const qty = lines.find((l) => l.menuItemId === product.id)?.quantity ?? 0;

  if (!product.isAvailable) {
    return (
      <span className="shrink-0 rounded-md bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
        {t("pg.dutyFree.outOfStock")}
      </span>
    );
  }
  if (!qty) {
    return (
      <button type="button" onClick={() => add(product, product.shop)} className="btn btn-sm btn-dark shrink-0">
        <Plus className="size-4" />
        {t("pg.menu.add")}
      </button>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-brand-50 p-1 ring-1 ring-brand-100 ring-inset">
      <button
        type="button"
        onClick={() => setQuantity(product.id, qty - 1)}
        aria-label={t("pg.menu.removeOne")}
        className="grid size-8 place-items-center rounded-lg text-brand-900 transition-colors hover:bg-white"
      >
        <Minus className="size-4" />
      </button>
      <span className="tnum w-6 text-center text-sm font-bold text-brand-900" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => add(product, product.shop)}
        aria-label={t("pg.menu.addOne")}
        className="grid size-8 place-items-center rounded-lg text-brand-900 transition-colors hover:bg-white"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function PriceBlock({ product, big }: { product: DutyFreeProduct; big?: boolean }) {
  return (
    <div className="min-w-0">
      <Price money={product.sellPrice} className={cn("font-bold text-brand-900", big && "text-xl")} />
      <PromoWas promotion={product.promotion} className="ms-1.5" />
      <PromoEnds promotion={product.promotion} className="mt-0.5" />
    </div>
  );
}

/**
 * A product, as a tile in the grid or (`row`) image-left in the list: photo,
 * name, who sells it, the price and the basket buttons. The photo and the name
 * open the product: every photo, the video, the description.
 */
export function ProductCard({ product, row }: { product: DutyFreeProduct; row?: boolean }) {
  const { t, lz } = usePrefs();
  const [open, setOpen] = useState(false);
  const name = lz(product.name);
  const photos = product.images ?? [];

  return (
    <article
      className={cn(
        "surface flex flex-col overflow-hidden",
        row && "flex-row",
        !product.isAvailable && "opacity-70"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("pg.dutyFree.details", { name })}
        className={cn(
          "group relative shrink-0 cursor-zoom-in overflow-hidden bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none",
          row ? "w-28 sm:w-56" : "aspect-4/3 w-full"
        )}
      >
        <Image
          src={mediaUrl(photos[0])}
          alt=""
          fill
          sizes={row ? "(max-width: 640px) 112px, 224px" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute end-2 bottom-2 flex gap-1">
          {product.videoUrl && (
            <span className="grid size-6 place-items-center rounded-md bg-black/60 text-white">
              <Play className="size-3" aria-hidden="true" />
            </span>
          )}
          {photos.length > 1 && (
            <span className="tnum flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              <Images className="size-3" aria-hidden="true" />
              {photos.length}
            </span>
          )}
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <p className="truncate text-xs font-medium text-ink-500">
          {t("pg.dutyFree.soldBy", { shop: lz(product.shop.name) })}
        </p>
        <h3 className="font-semibold leading-snug text-ink-900">
          <button type="button" onClick={() => setOpen(true)} className="text-start hover:underline">
            {name}
          </button>
        </h3>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <PriceBlock product={product} />
          <Quantity product={product} />
        </div>
      </div>

      <ProductDialog product={product} open={open} onOpenChange={setOpen} />
    </article>
  );
}

/** One product in full: every photo (each opens full screen), its video, its description. */
function ProductDialog({
  product,
  open,
  onOpenChange
}: {
  product: DutyFreeProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lz } = usePrefs();
  const name = lz(product.name);
  const description = lz(product.description);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[90dvh] gap-5 overflow-y-auto bg-white sm:max-w-2xl">
        <div className="pe-8">
          <p className="text-sm text-ink-500">{t("pg.dutyFree.soldBy", { shop: lz(product.shop.name) })}</p>
          <DialogTitle className="mt-1 text-xl leading-snug font-bold text-brand-900">{name}</DialogTitle>
        </div>
        {product.images?.length ? <Gallery images={product.images} alt={name} /> : null}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PriceBlock product={product} big />
          <Quantity product={product} />
        </div>
        {description && (
          <section>
            <h2 className="mb-2 text-base font-bold text-brand-900">{t("listing.description")}</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink-700">{description}</p>
          </section>
        )}
        <ListingVideo url={product.videoUrl} poster={product.images?.[0]} title={name} />
      </DialogContent>
    </Dialog>
  );
}
