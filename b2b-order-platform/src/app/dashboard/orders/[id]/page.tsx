"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { OrderMapping } from "@/lib/types";

export default function SellerOrderDetail() {
  // Segment is [id] by convention here (or [orderId] if pre-existing).
  // We read whichever param is present.
  const params = useParams<{ id?: string; orderId?: string }>();
  const orderId = params.id ?? params.orderId ?? "";
  const [mapping, setMapping] = useState<OrderMapping | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) {
      const data = await res.json();
      setMapping(data.mapping);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function despatch() {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/despatch`, { method: "POST" });
    setBusy(false);
    if (res.ok) load();
    else alert("Despatch failed. Try again.");
  }

  async function cancel() {
    const reason = prompt("Cancellation reason:");
    if (!reason) return;
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    if (res.ok) load();
    else alert("Cancel failed.");
  }

  if (!mapping) return <main className="p-8">Loading…</main>;

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Order {mapping.orderId}</h1>
      <div className="mb-6">Status: <strong>{mapping.status}</strong></div>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Buyer</h2>
        <p>{mapping.buyerName} — {mapping.buyerEmail} — {mapping.buyerPhone}</p>
        <p>
          {mapping.buyerAddress.streetName}, {mapping.buyerAddress.cityName}{" "}
          {mapping.buyerAddress.postalZone}, {mapping.buyerAddress.country}
        </p>
        {mapping.note && <p className="mt-2 text-gray-600">Note: {mapping.note}</p>}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Total</h2>
        <p>${mapping.payableAmount.toFixed(2)} {mapping.documentCurrencyCode}</p>
      </section>

      {mapping.status === "paid" && (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={despatch} className="px-6 py-2 bg-black text-white rounded">Despatched</button>
          <button type="button" disabled={busy} onClick={cancel} className="px-4 py-2 border border-red-600 text-red-700 rounded">Cancel order</button>
        </div>
      )}
      {mapping.status === "despatched" && <p className="text-gray-600">Awaiting buyer confirmation.</p>}
      {mapping.invoiceId && (
        <a href={`/api/invoices/${mapping.invoiceId}/pdf`} className="underline block mt-3">Invoice PDF</a>
      )}
      <a href={`/api/orders/${orderId}/xml`} className="underline block mt-2">Order UBL XML</a>
    </main>
  );
}
