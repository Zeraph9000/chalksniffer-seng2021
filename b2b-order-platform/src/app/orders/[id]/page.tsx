"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Order, OrderMapping } from "@/lib/types";
import { OrderDetailCard } from "@/components/order-detail-card";
import { OrderStatusTimeline } from "@/components/order-status-timeline";
import Link from "next/link";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [link, setLink] = useState<OrderMapping | null>(null);
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [orderRes, linkRes, sessionRes] = await Promise.all([
        fetch(`/api/orders/${id}`),
        fetch(`/api/links?orderId=${id}`),
        fetch("/api/auth/session"),
      ]);

      if (orderRes.ok) setOrder(await orderRes.json());
      if (linkRes.ok) setLink(await linkRes.json());
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRole(session.role);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-ink-muted">Loading order...</div>;
  }

  if (!order) {
    return <div className="py-12 text-center text-sm text-ink-muted">Order not found</div>;
  }

  const status = link?.status || "placed";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Order {order.id}</h1>

      <OrderStatusTimeline status={status} />
      <OrderDetailCard order={order} />

      <div className="card">
        <div className="border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-medium text-ink">Line Items</h2>
        </div>
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-surface-raised">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Item</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Qty</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {order.orderLines.map((line) => (
              <tr key={line.lineItem.id} className="hover:bg-surface-hover">
                <td className="px-4 py-2 text-sm text-ink font-mono">{line.lineItem.id}</td>
                <td className="px-4 py-2 text-sm text-ink">{line.lineItem.item.name}</td>
                <td className="px-4 py-2 text-sm text-ink">
                  {line.lineItem.quantity} {line.lineItem.unitCode}
                </td>
                <td className="px-4 py-2 text-sm text-ink font-mono">
                  {line.lineItem.price.priceAmount} {line.lineItem.price.currencyID}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        {role === "buyer" && status === "placed" && (
          <>
            <Link
              href={`/orders/${id}/change`}
              className="btn bg-gray-100 border border-gray-300 text-ink hover:bg-gray-200"
            >
              Request Change
            </Link>
            <Link
              href={`/orders/${id}/cancel`}
              className="btn-danger"
            >
              Cancel Order
            </Link>
          </>
        )}
        {role === "buyer" && status === "despatched" && (
          <Link
            href={`/orders/${id}/receive`}
            className="btn-primary"
          >
            Confirm Receipt
          </Link>
        )}
        {role === "seller" && status === "placed" && (
          <Link
            href={`/despatch/create?orderId=${id}`}
            className="btn-seller"
          >
            Despatch Order
          </Link>
        )}
        {role === "seller" && status === "received" && (
          <Link
            href={`/invoices/create?orderId=${id}`}
            className="btn-primary"
          >
            Create Invoice
          </Link>
        )}
        {(status === "invoiced" || (role === "buyer" && status === "received")) && link?.invoiceId && (
          <Link
            href={`/invoices/${link.invoiceId}`}
            className="btn-ghost"
          >
            View Invoice
          </Link>
        )}
      </div>
    </div>
  );
}
