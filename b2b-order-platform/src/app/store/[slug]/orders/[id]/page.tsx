"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { OrderMapping } from "@/lib/types";

export default function BuyerOrderDetail() {
  const { id: orderId } = useParams<{ slug: string; id: string }>();
  const [mapping, setMapping] = useState<OrderMapping | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) {
      setErr("Order not found or access denied.");
      return;
    }
    const data = await res.json();
    setMapping(data.mapping);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmReceipt() {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/confirm-receipt`, { method: "POST" });
    setBusy(false);
    if (res.ok) load();
    else alert("Failed to confirm. Please try again.");
  }

  if (err) return <p>{err}</p>;
  if (!mapping) return <p>Loading…</p>;

  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Order {mapping.orderId}</h1>
      <div className="text-gray-600 mb-6">Status: <strong>{mapping.status}</strong></div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Status timeline</h2>
        <ol className="space-y-1 text-sm">
          {mapping.statusHistory.map((e, i) => (
            <li key={i}>
              <strong>{e.status}</strong> — {new Date(e.at).toLocaleString()}
              {e.note ? ` · ${e.note}` : ""}
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Delivery</h2>
        <p>
          {mapping.buyerName}, {mapping.buyerAddress.streetName}, {mapping.buyerAddress.cityName}{" "}
          {mapping.buyerAddress.postalZone}, {mapping.buyerAddress.country}
        </p>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Total</h2>
        <p>${mapping.payableAmount.toFixed(2)} {mapping.documentCurrencyCode}</p>
      </div>

      {mapping.status === "despatched" && (
        <div className="space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={confirmReceipt}
            className="w-full py-4 bg-green-600 text-white rounded text-lg font-semibold disabled:opacity-50"
          >
            I received my order
          </button>
          <p className="text-xs text-gray-600 text-center">
            Usually the delivery driver will confirm this on your behalf.
          </p>
        </div>
      )}
    </section>
  );
}
