"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function OrderChangePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [changesMade, setChangesMade] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/order-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueDate: new Date().toISOString().split("T")[0],
          orderReferenceId: id,
          changesMade,
          buyer: { name: "Buyer", postalAddress: { streetName: "TBD", cityName: "TBD", postalZone: "0000", countryIdentificationCode: "AU" } },
          seller: { name: "Seller", postalAddress: { streetName: "TBD", cityName: "TBD", postalZone: "0000", countryIdentificationCode: "AU" } },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to submit change request");
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
      <h1 className="text-2xl font-bold text-ink">Request Order Change</h1>
      <p className="text-sm text-ink-muted">Order: <span className="font-mono">{id}</span></p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Changes Requested</label>
          <textarea required rows={4} value={changesMade} onChange={(e) => setChangesMade(e.target.value)} placeholder="Describe the changes you need..." className="input mt-1" />
        </div>
        {error && <p className="text-sm text-semantic-danger">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">{loading ? "Submitting..." : "Submit Change"}</button>
        </div>
      </form>
    </div>
  );
}
