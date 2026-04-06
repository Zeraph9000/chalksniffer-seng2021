"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MATERIAL_CATEGORIES, PRIORITIES, SAMPLE_SITES, SUPPLIER_DIRECTORY } from "@/lib/construction-data";

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
  streetName: string;
  cityName: string;
  postalZone: string;
  country: string;
};

function emptyLineItem(): LineItemForm {
  return { name: "", description: "", quantity: 1, unitCode: "EA", priceAmount: 0, currencyID: "AUD", category: "" };
}

function emptyParty(): PartyForm {
  return { partyName: "", streetName: "", cityName: "", postalZone: "", country: "AU" };
}

function PartyFields({
  label,
  party,
  onChange,
}: {
  label: string;
  party: PartyForm;
  onChange: (field: keyof PartyForm, value: string) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="input-label">Party Name</label>
          <input required value={party.partyName} onChange={(e) => onChange("partyName", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="input-label">Street</label>
          <input required value={party.streetName} onChange={(e) => onChange("streetName", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="input-label">City</label>
          <input required value={party.cityName} onChange={(e) => onChange("cityName", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="input-label">Postal Code</label>
          <input required value={party.postalZone} onChange={(e) => onChange("postalZone", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="input-label">Country (ISO 3166)</label>
          <input required maxLength={2} value={party.country} onChange={(e) => onChange("country", e.target.value.toUpperCase())} className="input mt-1" />
        </div>
      </div>
    </fieldset>
  );
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [currencyCode, setCurrencyCode] = useState("AUD");
  const [note, setNote] = useState("");
  const [buyer, setBuyer] = useState<PartyForm>(emptyParty());
  const [seller, setSeller] = useState<PartyForm>(emptyParty());
  const [lineItems, setLineItems] = useState<LineItemForm[]>([emptyLineItem()]);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [site, setSite] = useState("");
  const [priority, setPriority] = useState("standard");

  function updateLineItem(index: number, field: keyof LineItemForm, value: string | number) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    setLineItems((items) => [...items, emptyLineItem()]);
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
    setLoading(true);

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
          postalAddress: {
            streetName: seller.streetName,
            cityName: seller.cityName,
            postalZone: seller.postalZone,
            country: seller.country,
          },
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
      ...(recurring && { recurring: true, frequency, startDate }),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to create order");
        return;
      }

      router.push(`/orders/${data.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Create Order</h1>

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

        <PartyFields label="Contractor" party={buyer} onChange={(f, v) => updateParty(setBuyer, f, v)} />

        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <legend className="text-sm font-medium text-ink">Supplier</legend>
          <div className="mb-3">
            <label className="input-label">Select from directory</label>
            <select
              onChange={(e) => {
                const supplier = SUPPLIER_DIRECTORY.find(s => s.name === e.target.value);
                if (supplier) {
                  updateParty(setSeller, "partyName", supplier.name);
                }
              }}
              className="input mt-1"
              defaultValue=""
            >
              <option value="">Choose a supplier...</option>
              {SUPPLIER_DIRECTORY.map(s => (
                <option key={s.name} value={s.name}>{s.name} — {s.specialty}</option>
              ))}
            </select>
          </div>
          <PartyFields label="Supplier Details" party={seller} onChange={(f, v) => updateParty(setSeller, f, v)} />
        </fieldset>

        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <legend className="text-sm font-medium text-ink">Line Items</legend>
          {lineItems.map((item, i) => (
            <div key={i} className="mt-3 grid grid-cols-6 gap-2 border-b border-surface-border pb-3">
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
                <label className="input-label">Price</label>
                <input type="number" required step="0.01" min={0} value={item.priceAmount} onChange={(e) => updateLineItem(i, "priceAmount", Number(e.target.value))} className="input mt-1" />
              </div>
              <div className="flex items-end">
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(i)} className="btn-danger px-2 py-1.5 text-sm">Remove</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addLineItem} className="mt-3 text-sm font-medium text-accent-buyer hover:opacity-80">+ Add Line Item</button>
        </fieldset>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="rounded border-surface-border" />
            <span className="text-sm font-medium text-ink">Make this a recurring order</span>
          </label>
          {recurring && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as "Daily" | "Weekly" | "Monthly")} className="input mt-1">
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="input-label">Start Date</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input mt-1" />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? "Creating..." : "Create Order"}
        </button>
      </form>
    </div>
  );
}
