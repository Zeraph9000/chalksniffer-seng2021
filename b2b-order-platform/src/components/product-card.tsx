import Link from "next/link";
import type { Product } from "@/lib/types";

export function ProductCard({ product, storeSlug }: { product: Product; storeSlug: string }) {
  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const priceLabel = min === max ? `$${min.toFixed(2)}` : `from $${min.toFixed(2)}`;
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

  // Show a struck-through "was" price when at least one variant is discounted.
  // Use the compareAtPrice of the variant that hits `min` so the numbers align.
  const cheapest = product.variants.find((v) => v.price === min);
  const onSale = !!cheapest?.compareAtPrice && cheapest.compareAtPrice > cheapest.price;
  const compareLabel = onSale ? `$${cheapest!.compareAtPrice!.toFixed(2)}` : null;

  return (
    <Link
      href={`/store/${storeSlug}/product/${product.productId}`}
      className="block border rounded-lg overflow-hidden hover:shadow-md relative"
    >
      <div className="aspect-square bg-gray-100 relative">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        )}
        {onSale && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
            Sale
          </div>
        )}
        {totalStock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-medium">
            Out of stock
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-500 uppercase">{product.category}</div>
        <div className="font-medium">{product.name}</div>
        <div className="text-sm">
          <span className={onSale ? "text-red-600 font-semibold" : "text-gray-700"}>{priceLabel}</span>
          {compareLabel && <span className="ml-2 text-gray-400 line-through">{compareLabel}</span>}
        </div>
      </div>
    </Link>
  );
}
