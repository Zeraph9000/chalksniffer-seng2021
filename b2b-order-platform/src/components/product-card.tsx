import Link from "next/link";
import type { Product } from "@/lib/types";

export function ProductCard({ product, storeSlug }: { product: Product; storeSlug: string }) {
  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const priceLabel = min === max ? `$${min.toFixed(2)}` : `from $${min.toFixed(2)}`;
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

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
        {totalStock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-medium">
            Out of stock
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-500 uppercase">{product.category}</div>
        <div className="font-medium">{product.name}</div>
        <div className="text-sm text-gray-700">{priceLabel}</div>
      </div>
    </Link>
  );
}
