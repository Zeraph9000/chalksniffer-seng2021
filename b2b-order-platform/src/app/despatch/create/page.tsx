"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Order } from "@/lib/types";
import { ErrorBanner } from "@/components/error-banner";

type DespatchLineForm = {
  id: string;
  itemName: string;
  itemDescription: string;
  quantity: number;
  unitCode: string;
  orderLineId: string;
};

export default function CreateDespatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [documentID, setDocumentID] = useState("");
  const [lines, setLines] = useState<DespatchLineForm[]>([]);
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPostal, setDeliveryPostal] = useState("");
  const [deliveryCountry, setDeliveryCountry] = useState("AU");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    async function loadOrder() {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data: Order = await res.json();
        setOrder(data);
        setDocumentID(`DA-${orderId}`);
        setLines(
          data.orderLines.map((line) => ({
            id: line.lineItem.id,
            itemName: line.lineItem.item.name,
            itemDescription: line.lineItem.item.description || "",
            quantity: line.lineItem.quantity,
            unitCode: line.lineItem.unitCode || "EA",
            orderLineId: line.lineItem.id,
          }))
        );
        if (data.delivery?.deliveryAddress) {
          setDeliveryStreet(data.delivery.deliveryAddress.streetName || "");
          setDeliveryCity(data.delivery.deliveryAddress.cityName || "");
          setDeliveryPostal(data.delivery.deliveryAddress.postalZone || "");
          setDeliveryCountry(data.delivery.deliveryAddress.country || "AU");
        }
      }
    }
    loadOrder();
  }, [orderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = {
      documentID,
      senderId: order?.sellerSupplierParty.party.partyName || "",
      receiverId: order?.buyerCustomerParty.party.partyName || "",
      copyIndicator: false,
      issueDate: new Date().toISOString().split("T")[0],
      documentStatusCode: "despatched",
      orderReference: { id: orderId },
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
      deliveryCustomerParty: {
        party: {
          name: order?.buyerCustomerParty.party.partyName || "",
          postalAddress: {
            streetName: deliveryStreet,
            cityName: deliveryCity,
            postalZone: deliveryPostal,
            countryIdentificationCode: deliveryCountry,
          },
        },
      },
      shipment: {
        id: "SHP-1",
        consignmentId: "CON-1",
        delivery: {
          deliveryAddress: {
            streetName: deliveryStreet,
            cityName: deliveryCity,
            postalZone: deliveryPostal,
            countryIdentificationCode: deliveryCountry,
          },
          requestedDeliveryPeriod: {
            startDate,
            endDate: endDate || startDate,
          },
        },
      },
      despatchLines: lines.map((line) => ({
        id: line.id,
        deliveredQuantity: line.quantity,
        deliveredQuantityUnitCode: line.unitCode,
        orderLineReference: {
          lineId: line.orderLineId,
          orderReference: { id: orderId },
        },
        item: {
          name: line.itemName,
          description: line.itemDescription || line.itemName,
        },
      })),
    };

    try {
      const res = await fetch("/api/despatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create despatch advice");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Create Despatch Advice</h1>
      {orderId && <p className="text-sm text-ink-muted">For order: <span className="font-mono">{orderId}</span></p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="input-label">Document ID</label>
          <input required value={documentID} onChange={(e) => setDocumentID(e.target.value)} className="input mt-1" />
        </div>

        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4 opacity-75">
          <legend className="text-sm font-medium text-ink">Delivery Address (from order)</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div><label className="input-label">Street</label><input disabled value={deliveryStreet} className="input mt-1 bg-surface" /></div>
            <div><label className="input-label">City</label><input disabled value={deliveryCity} className="input mt-1 bg-surface" /></div>
            <div><label className="input-label">Postal Code</label><input disabled value={deliveryPostal} className="input mt-1 bg-surface" /></div>
            <div><label className="input-label">Country</label><input disabled value={deliveryCountry} className="input mt-1 bg-surface" /></div>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="input-label">Delivery Start</label><input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input mt-1" /></div>
          <div><label className="input-label">Delivery End</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input mt-1" /></div>
        </div>

        {lines.length > 0 && (
          <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
            <legend className="text-sm font-medium text-ink">Despatch Lines</legend>
            <div className="mt-2 grid grid-cols-[1fr_100px_60px] gap-3 text-xs font-medium text-ink-faint">
              <span>Item</span>
              <span>Quantity</span>
              <span>Unit</span>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_60px] gap-3 items-center border-b border-surface-border py-2">
                <span className="text-sm text-ink">{line.itemName}</span>
                <input type="number" min={0} value={line.quantity} onChange={(e) => { const updated = [...lines]; updated[i] = { ...updated[i], quantity: Number(e.target.value) }; setLines(updated); }} className="input" />
                <span className="text-xs text-ink-muted font-mono">{line.unitCode}</span>
              </div>
            ))}
          </fieldset>
        )}

        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <button type="submit" disabled={loading} className="btn-seller w-full disabled:opacity-50">
          {loading ? "Creating..." : "Create Despatch Advice"}
        </button>
      </form>
    </div>
  );
}
