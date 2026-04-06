"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function OrderCancelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/order-cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "order",
          documentId: id,
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to cancel order");
        return;
      }

      router.push(`/orders/${id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-ink">Cancel Order</h1>
      <p className="text-sm text-ink-muted">Order: <span className="font-mono">{id}</span></p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Reason for Cancellation</label>
          <textarea required rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you cancelling this order?" className="input mt-1" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">Go Back</button>
          <button type="submit" disabled={loading} className="btn-danger flex-1 disabled:opacity-50">{loading ? "Cancelling..." : "Cancel Order"}</button>
        </div>
      </form>
    </div>
  );
}
