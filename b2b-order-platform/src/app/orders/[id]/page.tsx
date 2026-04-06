"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Order, OrderMapping } from "@/lib/types";
import { OrderStatusTimeline } from "@/components/order-status-timeline";
import { StatusBadge } from "@/components/status-badge";
import { LoadingSpinner } from "@/components/loading-spinner";
import Link from "next/link";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [link, setLink] = useState<OrderMapping | null>(null);
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [submittingChange, setSubmittingChange] = useState(false);

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

  async function handleMarkPaid() {
    if (!link?.invoiceId) return;
    setMarkingPaid(true);
    const res = await fetch(`/api/invoices/${link.invoiceId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid", payment_date: new Date().toISOString().split("T")[0] }),
    });
    if (res.ok) {
      window.location.reload();
    }
    setMarkingPaid(false);
  }

  if (loading) return <LoadingSpinner message="Loading order..." />;

  if (!order) {
    return <div className="py-12 text-center text-sm text-ink-muted">Order not found</div>;
  }

  const status = link?.status || "placed";
  const isBuyer = role === "buyer";

  const orderTotal = order.orderLines.reduce((sum, line) => {
    return sum + line.lineItem.price.priceAmount * line.lineItem.quantity;
  }, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Order</h1>
          <p className="mt-1 font-mono text-sm text-ink-faint">{order.id}</p>
        </div>
        <StatusBadge
          label={
            status === "invoiced" ? "Awaiting Payment" :
            status === "placed" && link
              ? (isBuyer ? (link.buyerStatus === "needs_review" ? "Action Required" : "Awaiting Review")
                        : (link.sellerStatus === "needs_review" ? "Action Required" : "Awaiting Review"))
              : status.charAt(0).toUpperCase() + status.slice(1)
          }
          size="md"
        />
      </div>

      {/* Seller note banner */}
      {link?.sellerNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Supplier Note</p>
          <p className="mt-1 text-sm text-amber-700">{link.sellerNote}</p>
        </div>
      )}

      {/* Status message for placed orders */}
      {status === "placed" && link && (
        isBuyer ? (
          link.buyerStatus === "under_review" ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm text-blue-700">Your order has been submitted and is awaiting supplier review.</p>
            </div>
          ) : null
        ) : (
          link.sellerStatus === "under_review" ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm text-blue-700">Waiting for the contractor to update the order.</p>
            </div>
          ) : null
        )
      )}

      {/* Timeline */}
      <OrderStatusTimeline status={status} />

      {/* Order Details */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Order Details</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-ink-faint">Issue Date</p>
            <p className="mt-1 text-sm text-ink">{order.issueDate}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Currency</p>
            <p className="mt-1 font-mono text-sm text-ink">{order.documentCurrencyCode}</p>
          </div>
          {order.note && (
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs font-medium text-ink-faint">Note</p>
              <p className="mt-1 text-sm text-ink">{order.note}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-ink-faint">Contractor</p>
            <p className="mt-1 text-sm text-ink">{order.buyerCustomerParty.party.partyName}</p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {order.buyerCustomerParty.party.postalAddress.cityName}, {order.buyerCustomerParty.party.postalAddress.postalZone}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-faint">Supplier</p>
            <p className="mt-1 text-sm text-ink">{order.sellerSupplierParty.party.partyName}</p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {order.sellerSupplierParty.party.postalAddress.cityName}, {order.sellerSupplierParty.party.postalAddress.postalZone}
            </p>
          </div>
          {order.delivery?.deliveryAddress && (
            <div>
              <p className="text-xs font-medium text-ink-faint">Delivery Address</p>
              <p className="mt-1 text-sm text-ink">{order.delivery.deliveryAddress.streetName}</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {order.delivery.deliveryAddress.cityName}, {order.delivery.deliveryAddress.postalZone}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="card overflow-hidden">
        <div className="border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Line Items</h2>
        </div>
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-surface-raised">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Item</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Qty</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-ink-faint">Unit Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-ink-faint">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {order.orderLines.map((line) => {
              const lineTotal = line.lineItem.price.priceAmount * line.lineItem.quantity;
              return (
                <tr key={line.lineItem.id} className="hover:bg-surface-hover">
                  <td className="px-4 py-2">
                    <p className="text-sm font-medium text-ink">{line.lineItem.item.name}</p>
                    {line.lineItem.item.description && (
                      <p className="text-xs text-ink-faint">{line.lineItem.item.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-sm text-ink">
                    {line.lineItem.quantity} {line.lineItem.unitCode}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-ink">
                    {line.lineItem.price.priceAmount.toFixed(2)} {order.documentCurrencyCode}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm font-medium text-ink">
                    {lineTotal.toFixed(2)} {order.documentCurrencyCode}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-surface-border bg-surface-raised">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-ink">Order Total</td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold text-ink">
                {orderTotal.toFixed(2)} {order.documentCurrencyCode}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Receipt section — if received */}
      {status === "received" && link?.receiptAdviceId && (
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-faint">Receipt Advice</p>
          <p className="mt-1 font-mono text-sm text-ink">{link.receiptAdviceId}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Buyer: needs_review = edit order (seller requested change) */}
        {role === "buyer" && status === "placed" && link?.buyerStatus === "needs_review" && (
          <Link href={`/orders/${id}/edit`} className="btn-primary">
            Edit Order
          </Link>
        )}
        {role === "buyer" && status === "despatched" && (
          <Link href={`/orders/${id}/receive`} className="btn-primary">
            Confirm Receipt
          </Link>
        )}
        {/* Seller: needs_review = can despatch or request change */}
        {role === "seller" && status === "placed" && link?.sellerStatus === "needs_review" && (
          <>
            <Link href={`/despatch/create?orderId=${id}`} className="btn-primary">
              Despatch Order
            </Link>
          </>
        )}
        {/* Seller: request change form */}
        {role === "seller" && status === "placed" && link?.sellerStatus === "needs_review" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!changeNote.trim()) return;
              setSubmittingChange(true);
              const res = await fetch(`/api/orders/${id}/request-change`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: changeNote }),
              });
              if (res.ok) {
                setLink(await res.json());
                setChangeNote("");
              }
              setSubmittingChange(false);
            }}
            className="card w-full p-4 space-y-3"
          >
            <p className="text-sm font-medium text-ink">Request a change from the contractor</p>
            <textarea
              required
              rows={2}
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Describe what needs to change..."
              className="input"
            />
            <button type="submit" disabled={submittingChange} className="btn-warning disabled:opacity-50">
              {submittingChange ? "Sending..." : "Request Change"}
            </button>
          </form>
        )}
        {role === "seller" && status === "received" && (
          <Link
            href={`/invoices/create?orderId=${id}`}
            className="btn-primary"
          >
            Create Invoice
          </Link>
        )}
        {status === "invoiced" && link?.invoiceId && (
          <>
            <Link
              href={`/invoices/${link.invoiceId}`}
              className="btn-ghost"
            >
              View Invoice
            </Link>
            {role === "seller" && (
              <button
                onClick={handleMarkPaid}
                disabled={markingPaid}
                className="btn-success disabled:opacity-50"
              >
                {markingPaid ? "Updating..." : "Mark as Paid"}
              </button>
            )}
          </>
        )}
        {status === "paid" && link?.invoiceId && (
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
