import Link from "next/link";
import type { Product } from "@/lib/types";
import { transformedImageUrl } from "@/lib/image-url";

// Category → tile background color for the product art placeholder.
// Loosely matches the prototype's per-category palette.
const TILE_COLOR: Record<string, { bg: string; ink: string }> = {
  honey: { bg: "#e8c265", ink: "#4a2f0e" },
  pantry: { bg: "#c69a5a", ink: "#3a2712" },
  oils: { bg: "#8aa860", ink: "#263a14" },
  vinegars: { bg: "#8aa860", ink: "#263a14" },
  grains: { bg: "#c69a5a", ink: "#3a2712" },
  flours: { bg: "#c69a5a", ink: "#3a2712" },
  ferments: { bg: "#d9c097", ink: "#3a2a14" },
  tea: { bg: "#6d4a31", ink: "#1a0a00" },
  coffee: { bg: "#6d4a31", ink: "#1a0a00" },
  sale: { bg: "#d25e3a", ink: "#3a1004" },
  bakery: { bg: "#e8c265", ink: "#4a2f0e" },
  dairy: { bg: "#f2ece0", ink: "#4a3a1a" },
  produce: { bg: "#8aa860", ink: "#263a14" },
  apparel: { bg: "#3d4c7a", ink: "#14203d" },
  home: { bg: "#a65840", ink: "#2a0f08" },
  stationery: { bg: "#5b7a4a", ink: "#1a2512" },
  flowers: { bg: "#b24a5e", ink: "#3a0f18" },
  skincare: { bg: "#d48a6e", ink: "#3a1a0f" },
  books: { bg: "#2c3a5e", ink: "#0f1a3a" },
  kids: { bg: "#d94c4c", ink: "#3a0f0f" },
  vintage: { bg: "#6b4a78", ink: "#1f1028" },
};
const DEFAULT_TILE = { bg: "var(--brand-soft)", ink: "var(--brand-ink)" };

function tileFor(category: string | undefined) {
  if (!category) return DEFAULT_TILE;
  const key = category.toLowerCase();
  for (const k of Object.keys(TILE_COLOR)) {
    if (key.includes(k)) return TILE_COLOR[k];
  }
  return DEFAULT_TILE;
}

export function ProductCard({ product, storeSlug }: { product: Product; storeSlug: string }) {
  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

  const cheapest = product.variants.find((v) => v.price === min);
  const onSale = !!cheapest?.compareAtPrice && cheapest.compareAtPrice > cheapest.price;
  const compareLabel = onSale ? `$${cheapest!.compareAtPrice!.toFixed(0)}` : null;

  const low = totalStock > 0 && totalStock <= 5;
  const oos = totalStock === 0;

  // "3 sizes" when multi-variant; fall back to the single variant's optionValues joined.
  const variantLabel =
    product.variants.length > 1
      ? `${product.variants.length} sizes`
      : Object.values(product.variants[0]?.optionValues ?? {}).join(" · ") || "Single";

  const tile = tileFor(product.category);

  return (
    <Link
      href={`/store/${storeSlug}/product/${product.productId}`}
      className="group relative flex flex-col overflow-hidden rounded-[10px] border border-line bg-paper transition-colors hover:border-ink-3"
    >
      <div
        className="relative aspect-square overflow-hidden"
        style={{ background: tile.bg }}
      >
        {product.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={transformedImageUrl(product.imageUrls[0], "product")}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center font-display text-[44px] opacity-70"
            style={{ color: tile.ink }}
          >
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        {onSale && (
          <span className="absolute left-[10px] top-[10px] font-sans text-[11px] font-medium rounded-[3px] border border-line bg-paper px-[8px] py-[3px] text-ink">
            Sale
          </span>
        )}
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
        <div className="text-[13.5px] font-medium leading-[1.35] tracking-[-.005em] text-ink line-clamp-2 min-h-[36px]">
          {product.name}
        </div>
        <div className="mt-[2px] flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[14px] font-medium text-ink">
              ${min.toFixed(0)}
              {min !== max && <span className="text-ink-4">–${max.toFixed(0)}</span>}
            </span>
            {compareLabel && (
              <span className="font-mono text-[11.5px] text-ink-4 line-through">{compareLabel}</span>
            )}
          </div>
          {low && (
            <span className="font-mono text-[10.5px] text-warn">{totalStock} left</span>
          )}
        </div>
      </div>
    </Link>
  );
}
