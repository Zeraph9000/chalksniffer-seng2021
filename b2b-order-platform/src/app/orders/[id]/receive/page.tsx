"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Order, OrderMapping } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorBanner } from "@/components/error-banner";

type ReceiptLineForm = {
  id: string;
  itemName: string;
  expectedQty: number;
  receivedQty: number;
  unitCode: string;
  note: string;
};

export default function ReceiveOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [link, setLink] = useState<OrderMapping | null>(null);
  const [receiptLines, setReceiptLines] = useState<ReceiptLineForm[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const [orderRes, linkRes] = await Promise.all([
        fetch(`/api/orders/${id}`),
        fetch(`/api/links?orderId=${id}`),
      ]);

      if (orderRes.ok) {
        const orderData: Order = await orderRes.json();
        setOrder(orderData);
        setReceiptLines(
          orderData.orderLines.map((line) => ({
            id: line.lineItem.id,
            itemName: line.lineItem.item.name,
            expectedQty: line.lineItem.quantity,
            receivedQty: line.lineItem.quantity,
            unitCode: line.lineItem.unitCode || "EA",
            note: "",
          }))
        );
      }
      if (linkRes.ok) setLink(await linkRes.json());
      setLoading(false);
    }
    load();
  }, [id]);

  function updateLine(index: number, field: keyof ReceiptLineForm, value: string | number) {
    setReceiptLines((lines) =>
      lines.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!link?.despatchDocumentId) {
      setError("No despatch advice linked to this order");
      return;
    }
    setError("");
    setSubmitting(true);

    const body = {
      documentID: `RA-${id}`,
      senderId: order?.buyerCustomerParty.party.partyName || "",
      receiverId: order?.sellerSupplierParty.party.partyName || "",
      copyIndicator: false,
      issueDate: new Date().toISOString().split("T")[0],
      documentStatusCode: "received",
      note: note || undefined,
      orderReference: { id: id },
      despatchDocumentReference: { id: link.despatchDocumentId },
      deliveryCustomerParty: {
        party: {
          name: order?.buyerCustomerParty.party.partyName || "",
          postalAddress: {
            streetName: order?.buyerCustomerParty.party.postalAddress.streetName || "",
            cityName: order?.buyerCustomerParty.party.postalAddress.cityName || "",
            postalZone: order?.buyerCustomerParty.party.postalAddress.postalZone || "",
            countryIdentificationCode: order?.buyerCustomerParty.party.postalAddress.country || "AU",
          },
        },
      },
      despatchSupplierParty: {
        party: {
          name: order?.sellerSupplierParty.party.partyName || "",
          postalAddress: {
            streetName: order?.sellerSupplierParty.party.postalAddress.streetName || "",
            cityName: order?.sellerSupplierParty.party.postalAddress.cityName || "",
            postalZone: order?.sellerSupplierParty.party.postalAddress.postalZone || "",
            countryIdentificationCode: order?.sellerSupplierParty.party.postalAddress.country || "AU",
          },
        },
      },
      shipment: {
        id: "SHP-1",
        consignmentId: "CON-1",
        delivery: {
          actualDeliveryDate: new Date().toISOString().split("T")[0],
          requestedDeliveryPeriod: {
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
          },
        },
      },
      receiptLines: receiptLines.map((line) => ({
        id: line.id,
        receivedQuantity: line.receivedQty,
        receivedQuantityUnitCode: line.unitCode,
        shortQuantity: line.expectedQty > line.receivedQty ? line.expectedQty - line.receivedQty : undefined,
        shortQuantityUnitCode: line.expectedQty > line.receivedQty ? line.unitCode : undefined,
        note: line.note || undefined,
        item: { name: line.itemName, description: line.itemName },
      })),
    };

    try {
      const res = await fetch(`/api/despatch/${link.despatchDocumentId}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to confirm receipt");
        return;
      }

      router.push(`/orders/${id}`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading order..." />;
  if (!order) return <div className="py-12 text-center text-sm text-ink-muted">Order not found</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Confirm Receipt</h1>
      <p className="text-sm text-ink-muted">Order: <span className="font-mono">{id}</span></p>

      {order.delivery?.deliveryAddress && (
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-faint">Delivery Address</p>
          <p className="mt-1 text-sm text-ink">
            {order.delivery.deliveryAddress.streetName}, {order.delivery.deliveryAddress.cityName} {order.delivery.deliveryAddress.postalZone}
          </p>
          {order.delivery.requestedDeliveryPeriod?.startDate && (
            <p className="mt-1 text-xs text-ink-muted">
              Requested delivery: {order.delivery.requestedDeliveryPeriod.startDate}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-surface-raised">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Item</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Expected</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Received</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-faint">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {receiptLines.map((line, i) => (
                <tr key={line.id} className="hover:bg-surface-hover">
                  <td className="px-4 py-2 text-sm text-ink">{line.itemName}</td>
                  <td className="px-4 py-2 text-sm text-ink-muted font-mono">{line.expectedQty} {line.unitCode}</td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} max={line.expectedQty} value={line.receivedQty} onChange={(e) => updateLine(i, "receivedQty", Number(e.target.value))} className="input w-20" />
                  </td>
                  <td className="px-4 py-2">
                    <input value={line.note} onChange={(e) => updateLine(i, "note", e.target.value)} placeholder="Discrepancy note..." className="input w-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <label className="input-label">General Note (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input mt-1" />
        </div>

        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">{submitting ? "Confirming..." : "Confirm Receipt"}</button>
        </div>
      </form>
    </div>
  );
}
