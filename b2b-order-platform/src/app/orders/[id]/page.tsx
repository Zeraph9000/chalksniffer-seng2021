"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { OrderMapping } from "@/lib/types";

export default function OrderDetail() {
  const { id: orderId } = useParams<{ id: string }>();
  const params = useSearchParams();
  const token = params.get("t");
  const [mapping, setMapping] = useState<OrderMapping | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}${token ? `?t=${token}` : ""}`);
    if (!res.ok) {
      setErr("Order not found or access denied.");
      return;
    }
    const data = await res.json();
    setMapping(data.mapping);
  }, [orderId, token]);

  useEffect(() => { load(); }, [load]);

  async function confirmReceipt() {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/confirm-receipt${token ? `?t=${token}` : ""}`, { method: "POST" });
    setBusy(false);
    if (res.ok) load();
    else alert("Failed to confirm. Please try again.");
  }

  if (err) return <main className="p-8 text-center">{err}</main>;
  if (!mapping) return <main className="p-8">Loading…</main>;

  const cancelledEvent = mapping.statusHistory.find((e) => e.status === "cancelled");

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Order {mapping.orderId}</h1>
      <div className="text-gray-600 mb-6">Status: <strong>{mapping.status}</strong></div>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Status timeline</h2>
        <ol className="space-y-1 text-sm">
          {mapping.statusHistory.map((e, i) => (
            <li key={i}>
              <strong>{e.status}</strong> — {new Date(e.at).toLocaleString()}
              {e.note ? ` · ${e.note}` : ""}
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Delivery</h2>
        <p>
          {mapping.buyerName}, {mapping.buyerAddress.streetName}, {mapping.buyerAddress.cityName}{" "}
          {mapping.buyerAddress.postalZone}, {mapping.buyerAddress.country}
        </p>
        {mapping.note && <p className="text-gray-600 mt-2">Note: {mapping.note}</p>}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Total</h2>
        <p>${mapping.payableAmount.toFixed(2)} {mapping.documentCurrencyCode}</p>
      </section>

      {mapping.status === "despatched" && (
        <section className="space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={confirmReceipt}
            className="w-full py-4 bg-green-600 text-white rounded text-lg font-semibold disabled:opacity-50"
          >
            I received my order
          </button>
          <p className="text-xs text-ink-muted text-center">
            In the normal flow the delivery driver confirms receipt on the buyer&apos;s behalf
            after signature at handover. This button is available for manual confirmation if the
            driver hasn&apos;t done it yet.
          </p>
        </section>
      )}
      {mapping.status === "received" && <p className="text-gray-600">Generating invoice...</p>}
      {mapping.status === "invoiced" && (
        <div className="space-y-2">
          {mapping.invoiceId && (
            <a href={`/api/invoices/${mapping.invoiceId}/pdf`} className="underline block">Download invoice PDF</a>
          )}
          <a href={`/api/orders/${orderId}/xml`} className="underline block">Download order XML</a>
        </div>
      )}
      {mapping.status === "cancelled" && (
        <p className="text-red-700">Cancelled{cancelledEvent?.note ? ` · ${cancelledEvent.note}` : ""}</p>
      )}
    </main>
  );
}
