"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Order } from "@/lib/types";
import { ErrorBanner } from "@/components/error-banner";

type InvoiceLineForm = {
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_code: string;
};

export default function CreateInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [lines, setLines] = useState<InvoiceLineForm[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    async function loadOrder() {
      const [orderRes, linkRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`),
        fetch(`/api/links?orderId=${orderId}`),
      ]);

      if (orderRes.ok) {
        const data: Order = await orderRes.json();
        setOrder(data);
        setCustomerId(data.buyerCustomerParty.party.partyIdentification || data.buyerCustomerParty.party.partyName);

        // Check for receipt to use received quantities instead of ordered
        let receiptLines: { id: string; receivedQuantity?: number; item?: { name?: string } }[] = [];
        if (linkRes.ok) {
          const link = await linkRes.json();
          if (link.receiptAdviceId) {
            const receiptRes = await fetch(`/api/receipt/${link.receiptAdviceId}`);
            if (receiptRes.ok) {
              const receipt = await receiptRes.json();
              receiptLines = receipt.receiptLines || [];
            }
          }
        }

        setLines(
          data.orderLines.map((line) => {
            // Match receipt line by ID to get actual received quantity
            const receiptLine = receiptLines.find((rl) => rl.id === line.lineItem.id);
            const quantity = receiptLine?.receivedQuantity ?? line.lineItem.quantity;
            return {
              name: line.lineItem.item.name,
              description: line.lineItem.item.description || "",
              quantity,
              unit_price: line.lineItem.price.priceAmount,
              unit_code: line.lineItem.unitCode || "EA",
            };
          })
        );

        const due = new Date();
        due.setDate(due.getDate() + 30);
        setDueDate(due.toISOString().split("T")[0]);
      }
    }
    loadOrder();
  }, [orderId]);

  function updateLine(index: number, field: keyof InvoiceLineForm, value: string | number) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = {
      order_reference: orderId,
      customer_id: customerId,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: dueDate,
      currency: order?.documentCurrencyCode || "AUD",
      supplier: {
        name: order?.sellerSupplierParty.party.partyName || "",
        identifier: order?.sellerSupplierParty.party.partyIdentification || "",
      },
      customer: {
        name: order?.buyerCustomerParty.party.partyName || "",
        identifier: customerId,
      },
      items: lines.map((l) => ({
        name: l.name,
        description: l.description || undefined,
        quantity: l.quantity,
        unit_price: l.unit_price,
        unit_code: l.unit_code,
      })),
    };

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || "Failed to create invoice");
        return;
      }

      router.push("/invoices");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Create Invoice</h1>
      {orderId && <p className="text-sm text-ink-muted">For order: <span className="font-mono">{orderId}</span></p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Customer ABN</label>
            <input required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label className="input-label">Due Date</label>
            <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input mt-1" />
          </div>
        </div>

        <fieldset className="card rounded-lg border border-surface-border p-4">
          <legend className="input-label px-1">Invoice Lines</legend>
          {lines.map((line, i) => (
            <div key={i} className="mt-2 grid grid-cols-5 gap-2 border-b border-surface-border pb-2">
              <div>
                <label className="text-xs font-medium text-ink-faint">Name</label>
                <input required value={line.name} onChange={(e) => updateLine(i, "name", e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-faint">Qty</label>
                <input type="number" required min={1} value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-faint">Unit Price</label>
                <input type="number" required step="0.01" min={0} value={line.unit_price} onChange={(e) => updateLine(i, "unit_price", Number(e.target.value))} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-faint">Unit Code</label>
                <input required value={line.unit_code} onChange={(e) => updateLine(i, "unit_code", e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-faint">Description</label>
                <input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="input mt-1" />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLines([...lines, { name: "", description: "", quantity: 1, unit_price: 0, unit_code: "EA" }])}
            className="mt-3 text-sm font-medium text-accent-buyer hover:opacity-80"
          >
            + Add Line
          </button>
        </fieldset>

        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? "Creating..." : "Create Invoice"}
        </button>
      </form>
    </div>
  );
}
