import Link from "next/link";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { transformedImageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

export function ProductCard({ product, storeSlug }: { product: Product; storeSlug: string }) {
  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const priceLabel =
    min === max ? `$${min.toFixed(0)}` : `$${min.toFixed(0)}`;
  const priceSuffix = min === max ? null : `–$${max.toFixed(0)}`;
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

  const cheapest = product.variants.find((v) => v.price === min);
  const onSale = !!cheapest?.compareAtPrice && cheapest.compareAtPrice > cheapest.price;
  const compareLabel = onSale ? `$${cheapest!.compareAtPrice!.toFixed(0)}` : null;

  const low = totalStock > 0 && totalStock <= 5;
  const oos = totalStock === 0;

  const variantLabel =
    product.variants.length > 1
      ? `${product.variants.length} variants`
      : Object.values(product.variants[0]?.optionValues ?? {}).join(" · ") || "—";

  return (
    <Link
      href={`/store/${storeSlug}/product/${product.productId}`}
      className="group relative flex flex-col overflow-hidden rounded-[10px] border border-line bg-paper transition-colors hover:border-ink-3"
    >
      <div className="relative aspect-square bg-brand-soft overflow-hidden">
        {product.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={transformedImageUrl(product.imageUrls[0], "product")}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-brand-ink/40 font-display text-[40px]">
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        {onSale && (
          <span className="absolute left-[10px] top-[10px] font-mono text-[9.5px] tracking-[.12em] uppercase rounded-[3px] border border-line bg-paper px-[7px] py-[3px] text-ink">
            Sale
          </span>
        )}
        <button
          type="button"
          aria-label="Save for later"
          className="pointer-events-none absolute right-2 top-2 grid h-[30px] w-[30px] place-items-center rounded-full border border-line bg-paper/90 text-ink-3"
        >
          <Heart className="h-[14px] w-[14px]" />
        </button>
        {oos && (
          <div className="absolute inset-0 grid place-items-center bg-paper/70">
            <span className="rounded-full bg-ink px-[10px] py-1 text-[11.5px] font-medium text-paper">
              Sold out
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-[6px] p-3">
        <div className="text-[11.5px] text-ink-3 line-clamp-1">{variantLabel}</div>
        <div className="font-display text-[13.5px] font-medium leading-[1.35] tracking-[-.005em] text-ink line-clamp-2 min-h-[36px]">
          {product.name}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[14px] font-medium text-ink">
              {priceLabel}
              {priceSuffix && <span className="text-ink-4">{priceSuffix}</span>}
            </span>
            {compareLabel && (
              <span className="font-mono text-[11.5px] text-ink-4 line-through">{compareLabel}</span>
            )}
          </div>
          {low && <span className={cn("font-mono text-[10.5px] text-warn")}>{totalStock} left</span>}
        </div>
      </div>
    </Link>
  );
}
