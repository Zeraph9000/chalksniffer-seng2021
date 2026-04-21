"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { InvoiceDetail } from "@/lib/types";

export default function SellerInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`).then(async (r) => {
      if (!r.ok) { setErr("Could not load invoice"); return; }
      setInvoice(await r.json());
    });
  }, [id]);

  if (err) return <main className="p-8">{err}</main>;
  if (!invoice) return <main className="p-8">Loading…</main>;

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="mb-6">
        <Link href="/dashboard/invoices" className="text-sm underline">← Back to invoices</Link>
      </div>

      <h1 className="text-2xl font-bold mb-2 font-mono">{invoice.invoice_id}</h1>
      <div className="text-gray-600 mb-6">Status: <strong>{invoice.status}</strong></div>

      <section className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div><span className="text-gray-500">Order:</span> <span className="font-mono">{invoice.order_reference}</span></div>
        <div><span className="text-gray-500">Issue date:</span> {invoice.issue_date ?? "—"}</div>
        <div><span className="text-gray-500">Due date:</span> {invoice.due_date ?? "—"}</div>
        <div><span className="text-gray-500">Currency:</span> {invoice.currency}</div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Items</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr><th className="pb-2">Name</th><th className="pb-2">Qty</th><th className="pb-2">Unit price</th><th className="pb-2 text-right">Line total</th></tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i} className="border-t">
                <td className="py-2">{it.name}{it.description ? <span className="text-gray-500"> — {it.description}</span> : null}</td>
                <td className="py-2">{it.quantity} {it.unit_code}</td>
                <td className="py-2">${it.unit_price.toFixed(2)}</td>
                <td className="py-2 text-right">${it.line_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6 text-sm space-y-1">
        <div>Subtotal: <strong>${invoice.subtotal.toFixed(2)} {invoice.currency}</strong></div>
        <div>Tax inclusive: <strong>${invoice.tax_inclusive_amount.toFixed(2)}</strong></div>
        <div className="text-lg">Payable: <strong>${invoice.payable_amount.toFixed(2)} {invoice.currency}</strong></div>
      </section>

      <a
        href={`/api/invoices/${invoice.invoice_id}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 bg-black text-white rounded"
      >
        Open invoice PDF
      </a>
    </main>
  );
}
