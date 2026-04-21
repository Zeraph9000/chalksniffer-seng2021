"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function Cart() {
  const cart = useCart();
  const subtotal = cart.items.reduce((s, i) => s + i.quantity * i.unitPriceSnapshot, 0);

  if (cart.items.length === 0) {
    return (
      <main className="p-8 text-center">
        <p className="mb-4">Your cart is empty.</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Cart</h1>
      <p className="text-gray-600 mb-6">From <strong>{cart.storeName}</strong></p>

      <div className="border rounded divide-y">
        {cart.items.map((item) => (
          <div key={`${item.productId}-${item.variantId}`} className="p-4 flex gap-4 items-center">
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />
            )}
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-gray-600">{item.variantLabel}</div>
            </div>
            <input
              type="number"
              min={1}
              max={item.stock}
              value={item.quantity}
              onChange={(e) => cart.updateQuantity(item.productId, item.variantId, Number(e.target.value))}
              className="w-16 border rounded px-2 py-1"
            />
            <div className="w-24 text-right">${(item.quantity * item.unitPriceSnapshot).toFixed(2)}</div>
            <button type="button" onClick={() => cart.removeItem(item.productId, item.variantId)} className="text-red-600">×</button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <Link href={`/store/${cart.storeSlug ?? cart.storeId}`} className="underline text-sm">← Continue shopping at {cart.storeName}</Link>
        <div className="text-right">
          <div>Subtotal: <strong>${subtotal.toFixed(2)}</strong></div>
          <Link href="/checkout" className="inline-block mt-2 px-6 py-2 bg-black text-white rounded">Proceed to checkout</Link>
        </div>
      </div>
    </main>
  );
}
