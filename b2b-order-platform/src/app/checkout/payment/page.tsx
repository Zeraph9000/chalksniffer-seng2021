"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";

export default function Payment() {
  const params = useSearchParams();
  const router = useRouter();
  const cart = useCart();
  const [busy, setBusy] = useState(false);

  const pi = params.get("pi") || "";
  const orderId = params.get("orderId") || "";
  const total = Number(params.get("total") || 0);
  const currency = params.get("currency") || "AUD";
  const token = params.get("t");

  async function pay() {
    setBusy(true);
    const res = await fetch(`/api/checkout/${pi}/pay`, { method: "POST" });
    if (res.ok) {
      cart.clearCart();
      const qs = new URLSearchParams({ orderId });
      if (token) qs.set("t", token);
      router.push(`/checkout/success?${qs.toString()}`);
    } else {
      setBusy(false);
      alert("Payment failed (placeholder). Try again.");
    }
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Payment</h1>
      <p className="text-gray-500 mb-6 text-sm">This is a demo. In production this would be Stripe Elements.</p>
      <div className="border rounded p-6 space-y-4 bg-gray-50">
        <input disabled placeholder="4242 4242 4242 4242" className="w-full border rounded px-3 py-2 bg-white" />
        <div className="grid grid-cols-2 gap-2">
          <input disabled placeholder="12 / 26" className="border rounded px-3 py-2 bg-white" />
          <input disabled placeholder="CVC" className="border rounded px-3 py-2 bg-white" />
        </div>
      </div>
      <div className="mt-6 text-right">
        <button type="button" disabled={busy} onClick={pay} className="px-6 py-3 bg-black text-white rounded text-lg disabled:opacity-50">
          Pay ${total.toFixed(2)} {currency}
        </button>
      </div>
      <p className="mt-4 text-xs text-gray-400 text-center">Secured by Stripe (demo)</p>
    </main>
  );
}
