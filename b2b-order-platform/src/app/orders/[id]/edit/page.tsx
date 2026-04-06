"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Order } from "@/lib/types";
import { MATERIAL_CATEGORIES, PRIORITIES, SAMPLE_SITES } from "@/lib/construction-data";
import { ErrorBanner } from "@/components/error-banner";
import { LoadingSpinner } from "@/components/loading-spinner";

type LineItemForm = {
  name: string;
  description: string;
  quantity: number;
  unitCode: string;
  priceAmount: number;
  currencyID: string;
  category: string;
};

type PartyForm = {
  partyName: string;
  abn: string;
  streetName: string;
  cityName: string;
  postalZone: string;
  country: string;
};

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [currencyCode, setCurrencyCode] = useState("AUD");
  const [note, setNote] = useState("");
  const [buyer, setBuyer] = useState<PartyForm>({ partyName: "", abn: "", streetName: "", cityName: "", postalZone: "", country: "AU" });
  const [seller, setSeller] = useState<PartyForm>({ partyName: "", abn: "", streetName: "", cityName: "", postalZone: "", country: "AU" });
  const [lineItems, setLineItems] = useState<LineItemForm[]>([]);
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPostal, setDeliveryPostal] = useState("");
  const [deliveryCountry, setDeliveryCountry] = useState("AU");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [site, setSite] = useState("");
  const [priority, setPriority] = useState("standard");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) { setLoading(false); return; }
      const data: Order = await res.json();
      setOrder(data);
      setIssueDate(data.issueDate);
      setCurrencyCode(data.documentCurrencyCode);
      setNote(data.note || "");

      const bp = data.buyerCustomerParty.party;
      setBuyer({
        partyName: bp.partyName,
        abn: bp.partyIdentification || "",
        streetName: bp.postalAddress?.streetName || "",
        cityName: bp.postalAddress?.cityName || "",
        postalZone: bp.postalAddress?.postalZone || "",
        country: bp.postalAddress?.country || "AU",
      });

      const sp = data.sellerSupplierParty.party;
      setSeller({
        partyName: sp.partyName,
        abn: sp.partyIdentification || "",
        streetName: sp.postalAddress?.streetName || "",
        cityName: sp.postalAddress?.cityName || "",
        postalZone: sp.postalAddress?.postalZone || "",
        country: sp.postalAddress?.country || "AU",
      });

      if (data.delivery?.deliveryAddress) {
        setDeliveryStreet(data.delivery.deliveryAddress.streetName || "");
        setDeliveryCity(data.delivery.deliveryAddress.cityName || "");
        setDeliveryPostal(data.delivery.deliveryAddress.postalZone || "");
        setDeliveryCountry(data.delivery.deliveryAddress.country || "AU");
      }
      if (data.delivery?.requestedDeliveryPeriod) {
        setDeliveryDate(data.delivery.requestedDeliveryPeriod.startDate || "");
      }

      const noteParts = (data.note || "").split(" | ");
      for (const part of noteParts) {
        if (part.startsWith("Site: ")) setSite(part.replace("Site: ", ""));
        if (part.startsWith("Priority: ")) setPriority(part.replace("Priority: ", "").toLowerCase());
      }

      setLineItems(
        data.orderLines.map((line) => ({
          name: line.lineItem.item.name,
          description: line.lineItem.item.description || "",
          quantity: line.lineItem.quantity,
          unitCode: line.lineItem.unitCode || "EA",
          priceAmount: line.lineItem.price.priceAmount,
          currencyID: line.lineItem.price.currencyID || "AUD",
          category: "",
        }))
      );

      setLoading(false);
    }
    load();
  }, [id]);

  function updateLineItem(index: number, field: keyof LineItemForm, value: string | number) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    setLineItems((items) => [...items, { name: "", description: "", quantity: 1, unitCode: "EA", priceAmount: 0, currencyID: "AUD", category: "" }]);
  }

  function removeLineItem(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  function updateParty(setter: typeof setBuyer, field: keyof PartyForm, value: string) {
    setter((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const orderBody = {
      issueDate,
      documentCurrencyCode: currencyCode,
      note: [
        site && `Site: ${site}`,
        priority !== "standard" && `Priority: ${priority.toUpperCase()}`,
        note,
      ].filter(Boolean).join(" | ") || undefined,
      buyerCustomerParty: {
        party: {
          partyName: buyer.partyName,
          partyIdentification: buyer.abn,
          postalAddress: {
            streetName: buyer.streetName,
            cityName: buyer.cityName,
            postalZone: buyer.postalZone,
            country: buyer.country,
          },
        },
      },
      sellerSupplierParty: {
        party: {
          partyName: seller.partyName,
          partyIdentification: seller.abn,
          postalAddress: {
            streetName: seller.streetName,
            cityName: seller.cityName,
            postalZone: seller.postalZone,
            country: seller.country,
          },
        },
      },
      delivery: {
        deliveryAddress: {
          streetName: deliveryStreet,
          cityName: deliveryCity,
          postalZone: deliveryPostal,
          country: deliveryCountry,
        },
        requestedDeliveryPeriod: {
          startDate: deliveryDate,
          endDate: deliveryDate,
        },
      },
      orderLines: lineItems.map((item, index) => ({
        lineItem: {
          id: String(index + 1),
          quantity: item.quantity,
          unitCode: item.unitCode,
          price: { priceAmount: item.priceAmount, currencyID: item.currencyID },
          item: { name: item.name, description: item.description || undefined },
        },
      })),
    };

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to update order");
        return;
      }

      router.push(`/orders/${id}`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="py-12 text-center text-sm text-ink-muted">Order not found</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Edit Order</h1>
      <p className="text-sm text-ink-muted">Order: <span className="font-mono">{id}</span></p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Issue Date</label>
            <input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label className="input-label">Currency (ISO 4217)</label>
            <input required maxLength={3} value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} className="input mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Site / Project</label>
            <select value={site} onChange={(e) => setSite(e.target.value)} className="input mt-1">
              <option value="">Select site...</option>
              {SAMPLE_SITES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Priority</label>
            <div className="mt-1 flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    priority === p.id ? p.color : "border-surface-border text-ink-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="input-label">Note (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input mt-1" />
        </div>

        {/* Buyer party — editable */}
        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <legend className="text-sm font-medium text-ink">Contractor</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Company Name</label>
              <input required value={buyer.partyName} onChange={(e) => updateParty(setBuyer, "partyName", e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">ABN</label>
              <input required value={buyer.abn} onChange={(e) => updateParty(setBuyer, "abn", e.target.value)} className="input mt-1" maxLength={14} />
            </div>
            <div>
              <label className="input-label">Street</label>
              <input required value={buyer.streetName} onChange={(e) => updateParty(setBuyer, "streetName", e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">City</label>
              <input required value={buyer.cityName} onChange={(e) => updateParty(setBuyer, "cityName", e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">Postal Code</label>
              <input required value={buyer.postalZone} onChange={(e) => updateParty(setBuyer, "postalZone", e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">Country</label>
              <input required maxLength={2} value={buyer.country} onChange={(e) => updateParty(setBuyer, "country", e.target.value.toUpperCase())} className="input mt-1" />
            </div>
          </div>
        </fieldset>

        {/* Seller party — read-only */}
        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4 opacity-75">
          <legend className="text-sm font-medium text-ink">Supplier (read-only)</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Company Name</label>
              <input disabled value={seller.partyName} className="input mt-1 bg-surface" />
            </div>
            <div>
              <label className="input-label">ABN</label>
              <input disabled value={seller.abn} className="input mt-1 bg-surface" />
            </div>
            <div>
              <label className="input-label">Street</label>
              <input disabled value={seller.streetName} className="input mt-1 bg-surface" />
            </div>
            <div>
              <label className="input-label">City</label>
              <input disabled value={seller.cityName} className="input mt-1 bg-surface" />
            </div>
            <div>
              <label className="input-label">Postal Code</label>
              <input disabled value={seller.postalZone} className="input mt-1 bg-surface" />
            </div>
            <div>
              <label className="input-label">Country</label>
              <input disabled value={seller.country} className="input mt-1 bg-surface" />
            </div>
          </div>
        </fieldset>

        {/* Delivery address */}
        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <legend className="text-sm font-medium text-ink">Delivery Address</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="input-label">Street</label>
              <input required value={deliveryStreet} onChange={(e) => setDeliveryStreet(e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">City</label>
              <input required value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">Postal Code</label>
              <input required value={deliveryPostal} onChange={(e) => setDeliveryPostal(e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">Requested Delivery Date</label>
              <input type="date" required value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="input mt-1" />
            </div>
          </div>
        </fieldset>

        {/* Line items */}
        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <legend className="text-sm font-medium text-ink">Line Items</legend>
          {lineItems.map((item, i) => (
            <div key={i} className="mt-3 grid gap-2 border-b border-surface-border pb-3" style={{ gridTemplateColumns: "1fr 2fr 0.7fr 0.7fr 0.9fr 0.9fr auto" }}>
              <div>
                <label className="input-label">Category</label>
                <select
                  value={item.category}
                  onChange={(e) => {
                    const cat = MATERIAL_CATEGORIES.find(c => c.id === e.target.value);
                    updateLineItem(i, "category", e.target.value);
                    if (cat) updateLineItem(i, "unitCode", cat.defaultUnit);
                  }}
                  className="input mt-1"
                >
                  <option value="">Select...</option>
                  {MATERIAL_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Name</label>
                <input required value={item.name} onChange={(e) => updateLineItem(i, "name", e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="input-label">Qty</label>
                <input type="number" required min={1} value={item.quantity} onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))} className="input mt-1" />
              </div>
              <div>
                <label className="input-label">Unit</label>
                <input value={item.unitCode} onChange={(e) => updateLineItem(i, "unitCode", e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="input-label">Unit Price</label>
                <input type="number" required step="0.01" min={0} value={item.priceAmount} onChange={(e) => updateLineItem(i, "priceAmount", Number(e.target.value))} className="input mt-1" />
              </div>
              <div>
                <label className="input-label">Line Total</label>
                <p className="input mt-1 bg-surface text-ink-muted">{(item.quantity * item.priceAmount).toFixed(2)}</p>
              </div>
              <div className="flex items-end">
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(i)} className="btn-danger px-2 py-1.5 text-sm">Remove</button>
                )}
              </div>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={addLineItem} className="text-sm font-medium text-accent-buyer hover:opacity-80">+ Add Line Item</button>
            <p className="text-sm font-medium text-ink">
              Order Total: <span className="font-mono pl-2">{lineItems.reduce((sum, item) => sum + item.quantity * item.priceAmount, 0).toFixed(2)} {currencyCode}</span>
            </p>
          </div>
        </fieldset>

        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
