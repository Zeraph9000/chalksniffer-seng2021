"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { InvoiceDetail } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      const [res, sessionRes] = await Promise.all([
        fetch(`/api/invoices/${id}`),
        fetch("/api/auth/session"),
      ]);
      if (res.ok) setInvoice(await res.json());
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRole(session.role);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function updateStatus(newStatus: "sent" | "paid") {
    setUpdating(true);
    const body: Record<string, string> = { status: newStatus };
    if (newStatus === "paid") {
      body.payment_date = new Date().toISOString().split("T")[0];
    }
    const res = await fetch(`/api/invoices/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setInvoice((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    setUpdating(false);
  }

  async function exportXml() {
    const res = await fetch(`/api/invoices/${id}`, {
      headers: { Accept: "application/xml" },
    });
    if (res.ok) {
      const xml = await res.text();
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${id}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!invoice) return <div className="py-12 text-center text-sm text-ink-muted">Invoice not found</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Invoice <span className="font-mono">{invoice.invoice_id}</span></h1>
        <div className="flex gap-2">
          <StatusBadge
            label={
              invoice.status === "sent" && role === "buyer" ? "Payment Required" :
              invoice.status === "sent" && role === "seller" ? "Awaiting Payment" :
              invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
            }
            size="md"
          />
          <button onClick={exportXml} className="btn-ghost px-3 py-1 text-sm">Export XML</button>
        </div>
      </div>

      <div className="card rounded-lg border border-surface-border bg-surface-raised p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-ink-faint">Issue Date</p>
            <p className="mt-1 text-sm text-ink">{invoice.issue_date}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Due Date</p>
            <p className="mt-1 text-sm text-ink">{invoice.due_date}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Currency</p>
            <p className="mt-1 text-sm text-ink font-mono">{invoice.currency}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Order Ref</p>
            <p className="mt-1 text-sm text-ink font-mono">{invoice.order_reference}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Supplier</p>
            <p className="mt-1 text-sm text-ink">{invoice.supplier?.name}</p>
            <p className="mt-0.5 text-xs text-ink-faint font-mono">{invoice.supplier?.identifier}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Customer</p>
            <p className="mt-1 text-sm text-ink">{invoice.customer?.name}</p>
            <p className="mt-0.5 text-xs text-ink-faint font-mono">{invoice.customer?.identifier}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Subtotal</p>
            <p className="mt-1 text-sm text-ink font-mono">{invoice.subtotal} {invoice.currency}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Payable</p>
            <p className="mt-1 text-sm font-semibold font-mono text-ink">{invoice.payable_amount} {invoice.currency}</p>
          </div>
        </div>
      </div>

      {invoice.items && invoice.items.length > 0 && (
        <div className="card rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-medium text-ink">Line Items</h2>
          </div>
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-surface-overlay">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Item</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Qty</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Unit Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {invoice.items.map((item, i) => (
                <tr key={i} className="hover:bg-surface-hover">
                  <td className="px-4 py-2 text-sm text-ink">{item.name}</td>
                  <td className="px-4 py-2 text-sm text-ink font-mono">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-ink font-mono">{item.unit_price}</td>
                  <td className="px-4 py-2 text-sm text-ink font-mono">{item.unit_code}</td>
                  <td className="px-4 py-2 text-sm font-medium font-mono text-ink">{item.line_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Seller actions */}
      {role === "seller" && invoice.status !== "paid" && (
        <div className="flex gap-3">
          <button
            onClick={() => updateStatus("paid")}
            disabled={updating}
            className="btn bg-semantic-success-muted border border-emerald-300 text-semantic-success hover:bg-emerald-100 disabled:opacity-50"
          >
            {updating ? "Updating..." : "Mark as Paid"}
          </button>
        </div>
      )}
    </div>
  );
}
