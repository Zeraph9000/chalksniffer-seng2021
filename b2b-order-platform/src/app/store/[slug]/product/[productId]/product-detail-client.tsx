"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { VariantPicker } from "@/components/variant-picker";
import { ReplaceCartModal } from "@/components/replace-cart-modal";
import type { Product, ProductVariant, Store } from "@/lib/types";

export function ProductDetailClient({ store, product }: { store: Store; product: Product }) {
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; incoming: string }>({ open: false, incoming: "" });
  const cart = useCart();
  const router = useRouter();
  const storeSlug = store.slug ?? store.storeId;

  const handleVariantChange = useCallback((v: ProductVariant | null) => setVariant(v), []);

  const variantLabel = product.options.length === 0
    ? product.name
    : (product.options.map((o) => variant?.optionValues[o.name]).filter(Boolean).join(" / ") || "Select options");

  function addToCart() {
    if (!variant) return;
    const res = cart.addItem({
      productId: product.productId,
      variantId: variant.variantId,
      name: product.name,
      variantLabel,
      imageUrl: variant.imageUrl ?? product.imageUrl,
      unitCode: product.unitCode,
      unitPriceSnapshot: variant.price,
      currency: product.currency,
      quantity: qty,
      stock: variant.stock,
      storeId: store.storeId,
      storeSlug,
      storeName: store.storeName,
    });
    if (!res.ok && res.reason === "DIFFERENT_STORE") {
      setModal({ open: true, incoming: store.storeName });
    } else {
      router.push("/cart");
    }
  }

  function replaceCart() {
    if (!variant) return;
    cart.forceReplaceWith({
      productId: product.productId,
      variantId: variant.variantId,
      name: product.name,
      variantLabel,
      imageUrl: variant.imageUrl ?? product.imageUrl,
      unitCode: product.unitCode,
      unitPriceSnapshot: variant.price,
      currency: product.currency,
      quantity: qty,
      stock: variant.stock,
      storeId: store.storeId,
      storeSlug,
      storeName: store.storeName,
    });
    setModal({ open: false, incoming: "" });
    router.push("/cart");
  }

  const fromPrice = Math.min(...product.variants.map((v) => v.price));

  return (
    <main className="max-w-6xl mx-auto p-8 grid md:grid-cols-2 gap-8">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={variant?.imageUrl ?? product.imageUrl} alt={product.name} className="w-full aspect-square object-cover rounded-lg" />
      </div>
      <div>
        <div className="text-sm text-gray-500 uppercase">{product.category}</div>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <div className="text-2xl mt-2">
          {variant ? `$${variant.price.toFixed(2)}` : `from $${fromPrice.toFixed(2)}`}
        </div>

        <div className="my-6">
          <VariantPicker product={product} onChange={handleVariantChange} />
        </div>

        {variant && (
          <div className="text-sm text-gray-600 mb-4">
            Selected: <strong>{variantLabel}</strong> — In stock: {variant.stock}
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <label htmlFor="qty">Qty:</label>
          <input
            id="qty"
            type="number"
            min={1}
            max={variant?.stock ?? 1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value), variant?.stock ?? 1)))}
            className="w-16 border rounded px-2 py-1"
          />
        </div>

        <button
          type="button"
          disabled={!variant || variant.stock === 0 || store.status !== "active"}
          onClick={addToCart}
          className="w-full py-3 bg-black text-white rounded font-medium disabled:opacity-40"
        >
          {store.status !== "active"
            ? "Store not accepting orders"
            : variant && variant.stock === 0
              ? "Out of stock"
              : "Add to cart"}
        </button>

        <p className="mt-6 text-gray-700 whitespace-pre-line">{product.description}</p>
      </div>

      <ReplaceCartModal
        open={modal.open}
        currentStore={cart.storeName ?? ""}
        newStore={modal.incoming}
        onCancel={() => setModal({ open: false, incoming: "" })}
        onReplace={replaceCart}
      />
    </main>
  );
}
