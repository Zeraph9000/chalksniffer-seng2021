"use client";

import { useEffect, useState } from "react";
import { DespatchAdvice } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";

function statusClass(status: string) {
  switch (status) {
    case "DESPATCHED": return "status-despatched";
    case "RECEIVED": return "status-received";
    case "FULFILMENT_CANCELLED": return "status-cancelled";
    default: return "status-draft";
  }
}

export default function DespatchListPage() {
  const [advices, setAdvices] = useState<DespatchAdvice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/despatch");
      if (res.ok) setAdvices(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner message="Loading deliveries..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Site Deliveries</h1>
        <p className="mt-1 text-sm text-ink-muted">Track material shipments and site delivery confirmations.</p>
      </div>
      {advices.length === 0 ? (
        <EmptyState
          title="No site deliveries"
          description="Deliveries will appear here after you despatch materials"
          actionLabel="New Despatch"
          actionHref="/despatch/create"
        />
      ) : (
        <div className="space-y-2">
          {advices.map((da) => (
            <div
              key={da.uuid || da.documentID}
              className="card flex items-center justify-between px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium text-ink font-mono">{da.documentID}</p>
                <p className="text-xs text-ink-muted">
                  {da.issueDate} · Order: {da.orderReference?.id}
                </p>
              </div>
              <span className={statusClass(da.status)}>{da.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
