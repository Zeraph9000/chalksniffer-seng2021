"use client";

import { useEffect, useState } from "react";
import { InvoiceSummary } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";

function statusClass(status: string) {
  switch (status) {
    case "draft": return "status-draft";
    case "sent": return "status-sent";
    case "paid": return "status-paid";
    default: return "status-draft";
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.items || data.invoices || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner message="Loading invoices..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Invoices</h1>
        <p className="mt-1 text-sm text-ink-muted">View and manage invoices for material orders.</p>
      </div>
      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Invoices will appear here once materials are delivered and invoiced" />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.invoice_id}
              onClick={() => window.location.href = `/invoices/${inv.invoice_id}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.location.href = `/invoices/${inv.invoice_id}`; } }}
              aria-label={`Invoice ${inv.invoice_id}, ${inv.status}, ${inv.payable_amount} ${inv.currency}`}
              className="card flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            >
              <div className="flex items-center gap-4">
                <span className={statusClass(inv.status)}>{inv.status}</span>
                <div>
                  <p className="text-sm font-medium text-ink font-mono">{inv.invoice_id}</p>
                  <p className="text-xs text-ink-muted">
                    {inv.issue_date} · Due: {inv.due_date} · Ref: {inv.order_reference}
                  </p>
                </div>
              </div>
              <p className={`text-sm font-semibold font-mono ${inv.status === "paid" ? "text-semantic-success" : "text-ink"}`}>{inv.payable_amount} {inv.currency}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
