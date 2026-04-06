"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MATERIAL_CATEGORIES, PRIORITIES, SAMPLE_SITES } from "@/lib/construction-data";
import { ErrorBanner } from "@/components/error-banner";

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

function emptyLineItem(): LineItemForm {
  return { name: "", description: "", quantity: 1, unitCode: "EA", priceAmount: 0, currencyID: "AUD", category: "" };
}

function emptyParty(): PartyForm {
  return { partyName: "", abn: "", streetName: "", cityName: "", postalZone: "", country: "AU" };
}

function PartyFields({
  label,
  party,
  onChange,
  readOnly = false,
}: {
  label: string;
  party: PartyForm;
  onChange: (field: keyof PartyForm, value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="input-label">Party Name</label>
          <input required value={party.partyName} onChange={(e) => onChange("partyName", e.target.value)} className="input mt-1" readOnly={readOnly} />
        </div>
        <div className="col-span-2">
          <label className="input-label">ABN</label>
          <input required value={party.abn} onChange={(e) => onChange("abn", e.target.value)} className="input mt-1" placeholder="11 digit ABN" readOnly={readOnly} />
        </div>
        <div>
          <label className="input-label">Street</label>
          <input required value={party.streetName} onChange={(e) => onChange("streetName", e.target.value)} className="input mt-1" readOnly={readOnly} />
        </div>
        <div>
          <label className="input-label">City</label>
          <input required value={party.cityName} onChange={(e) => onChange("cityName", e.target.value)} className="input mt-1" readOnly={readOnly} />
        </div>
        <div>
          <label className="input-label">Postal Code</label>
          <input required value={party.postalZone} onChange={(e) => onChange("postalZone", e.target.value)} className="input mt-1" readOnly={readOnly} />
        </div>
        <div>
          <label className="input-label">Country (ISO 3166)</label>
          <input required maxLength={2} value={party.country} onChange={(e) => onChange("country", e.target.value.toUpperCase())} className="input mt-1" readOnly={readOnly} />
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
  const [sellers, setSellers] = useState<{ name: string; email: string; companyName?: string; abn?: string; address?: { streetName: string; cityName: string; postalZone: string; country: string } }[]>([]);
  const [sellerEmail, setSellerEmail] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPostal, setDeliveryPostal] = useState("");
  const [deliveryCountry, setDeliveryCountry] = useState("AU");
  const [deliveryDate, setDeliveryDate] = useState("");

  useEffect(() => {
    async function loadData() {
      const [sellersRes, sessionRes] = await Promise.all([
        fetch("/api/users/sellers"),
        fetch("/api/auth/session"),
      ]);

      if (sellersRes.ok) {
        const data = await sellersRes.json();
        setSellers(data);
      }

      if (sessionRes.ok) {
        const session = await sessionRes.json();
        // Pre-fill buyer from session profile
        setBuyer({
          partyName: session.companyName || session.name || "",
          abn: session.abn || "",
          streetName: session.address?.streetName || "",
          cityName: session.address?.cityName || "",
          postalZone: session.address?.postalZone || "",
          country: session.address?.country || "AU",
        });
        // Pre-fill delivery address from buyer address
        setDeliveryStreet(session.address?.streetName || "");
        setDeliveryCity(session.address?.cityName || "");
        setDeliveryPostal(session.address?.postalZone || "");
        setDeliveryCountry(session.address?.country || "AU");
      }
    }
    loadData();
  }, []);

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

  const orderTotal = lineItems.reduce((sum, item) => sum + item.priceAmount * item.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const orderBody = {
      sellerEmail,
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
          partyIdentification: buyer.abn || undefined,
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
          partyIdentification: seller.abn || undefined,
          postalAddress: {
            streetName: seller.streetName,
            cityName: seller.cityName,
            postalZone: seller.postalZone,
            country: seller.country,
          },
        },
      },
      ...(deliveryStreet && {
        delivery: {
          deliveryAddress: {
            streetName: deliveryStreet,
            cityName: deliveryCity,
            postalZone: deliveryPostal,
            country: deliveryCountry,
          },
          ...(deliveryDate && {
            requestedDeliveryPeriod: {
              startDate: deliveryDate,
              endDate: deliveryDate,
            },
          }),
        },
      }),
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
            <label className="input-label">Select a registered supplier</label>
            <select
              required
              value={sellerEmail}
              onChange={(e) => {
                const selected = sellers.find(s => s.email === e.target.value);
                setSellerEmail(e.target.value);
                if (selected) {
                  setSeller({
                    partyName: selected.companyName || selected.name,
                    abn: selected.abn || "",
                    streetName: selected.address?.streetName || "",
                    cityName: selected.address?.cityName || "",
                    postalZone: selected.address?.postalZone || "",
                    country: selected.address?.country || "AU",
                  });
                }
              }}
              className="input mt-1"
            >
              <option value="">Choose a supplier...</option>
              {sellers.map(s => (
                <option key={s.email} value={s.email}>{s.companyName || s.name}</option>
              ))}
            </select>
          </div>
          <PartyFields label="Supplier Details" party={seller} onChange={(f, v) => updateParty(setSeller, f, v)} />
        </fieldset>

        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <legend className="text-sm font-medium text-ink">Delivery Address</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="input-label">Street</label>
              <input value={deliveryStreet} onChange={(e) => setDeliveryStreet(e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">City</label>
              <input value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">Postal Code</label>
              <input value={deliveryPostal} onChange={(e) => setDeliveryPostal(e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">Country</label>
              <input maxLength={2} value={deliveryCountry} onChange={(e) => setDeliveryCountry(e.target.value.toUpperCase())} className="input mt-1" />
            </div>
            <div>
              <label className="input-label">Delivery Date (optional)</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="input mt-1" />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <legend className="text-sm font-medium text-ink">Line Items</legend>
          {lineItems.map((item, i) => {
            const lineTotal = item.priceAmount * item.quantity;
            return (
              <div key={i} className="mt-3 grid grid-cols-7 gap-2 border-b border-surface-border pb-3">
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
                <div>
                  <label className="input-label">Line Total</label>
                  <div className="input mt-1 bg-surface-overlay font-mono text-sm text-ink">
                    {lineTotal.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-end">
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeLineItem(i)} className="btn-danger px-2 py-1.5 text-sm">Remove</button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={addLineItem} className="text-sm font-medium text-accent-buyer hover:opacity-80">+ Add Line Item</button>
            <p className="text-sm font-semibold text-ink">
              Order Total: <span className="font-mono text-emerald-600">{orderTotal.toFixed(2)} {currencyCode}</span>
            </p>
          </div>
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

        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? "Creating..." : "Create Order"}
        </button>
      </form>
    </div>
  );
}
