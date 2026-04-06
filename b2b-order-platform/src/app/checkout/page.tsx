"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorBanner } from "@/components/error-banner";
import { EmptyState } from "@/components/empty-state";

type SessionData = {
  role: string;
  name: string;
  email: string;
  companyName: string;
  abn: string;
  phone: string;
  address?: {
    streetName?: string;
    cityName?: string;
    postalZone?: string;
    country?: string;
  };
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Buyer details (pre-filled from session)
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");
  const [buyerStreet, setBuyerStreet] = useState("");
  const [buyerCity, setBuyerCity] = useState("");
  const [buyerPostal, setBuyerPostal] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("AU");

  // Delivery address
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPostal, setDeliveryPostal] = useState("");
  const [deliveryCountry, setDeliveryCountry] = useState("AU");

  // Other fields
  const [deliveryDate, setDeliveryDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data: SessionData = await res.json();
          setSession(data);
          setCompanyName(data.companyName || "");
          setAbn(data.abn || "");
          if (data.address) {
            setBuyerStreet(data.address.streetName || "");
            setBuyerCity(data.address.cityName || "");
            setBuyerPostal(data.address.postalZone || "");
            setBuyerCountry(data.address.country || "AU");
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner message="Loading checkout..." />;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Checkout</h1>
        <EmptyState
          title="Your cart is empty"
          description="Add materials from the catalogue before checking out"
          actionLabel="Browse Catalogue"
          actionHref="/marketplace"
        />
      </div>
    );
  }

  // Group items by seller for order summary
  const sellerGroups: Record<string, { sellerName: string; items: typeof items }> = {};
  for (const item of items) {
    if (!sellerGroups[item.sellerEmail]) {
      sellerGroups[item.sellerEmail] = { sellerName: item.sellerName, items: [] };
    }
    sellerGroups[item.sellerEmail].items.push(item);
  }

  const grandTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const primaryCurrency = items[0]?.currency || "AUD";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!deliveryStreet.trim() || !deliveryCity.trim() || !deliveryPostal.trim()) {
      setError("Please fill in all required delivery address fields.");
      return;
    }
    if (!deliveryDate) {
      setError("Please select a requested delivery date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        buyerDetails: {
          companyName,
          abn,
          address: { streetName: buyerStreet, cityName: buyerCity, postalZone: buyerPostal, country: buyerCountry },
          email: session?.email || "",
          name: session?.name || "",
        },
        deliveryAddress: {
          streetName: deliveryStreet.trim(),
          cityName: deliveryCity.trim(),
          postalZone: deliveryPostal.trim(),
          country: deliveryCountry,
        },
        deliveryDate,
        note: note.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to place order");
      }

      clearCart();
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Checkout</h1>
        <p className="mt-1 text-sm text-ink-muted">Review your order and provide delivery details</p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form — takes up more space */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
          {/* Buyer Details */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold text-ink">Buyer Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="input-label">ABN</label>
                <input
                  type="text"
                  value={abn}
                  onChange={(e) => setAbn(e.target.value)}
                  className="input"
                  placeholder="12 345 678 901"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="input-label">Street</label>
                <input type="text" required value={buyerStreet} onChange={(e) => setBuyerStreet(e.target.value)} className="input" />
              </div>
              <div>
                <label className="input-label">City</label>
                <input type="text" required value={buyerCity} onChange={(e) => setBuyerCity(e.target.value)} className="input" />
              </div>
              <div>
                <label className="input-label">Postal Code</label>
                <input type="text" required value={buyerPostal} onChange={(e) => setBuyerPostal(e.target.value)} className="input" />
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold text-ink">Delivery Address</h2>

            <div>
              <label className="input-label">Street Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={deliveryStreet}
                onChange={(e) => setDeliveryStreet(e.target.value)}
                className="input"
                placeholder="123 Construction Ave"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="input-label">City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  className="input"
                  placeholder="Sydney"
                  required
                />
              </div>
              <div>
                <label className="input-label">Postal Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={deliveryPostal}
                  onChange={(e) => setDeliveryPostal(e.target.value)}
                  className="input"
                  placeholder="2000"
                  required
                />
              </div>
              <div>
                <label className="input-label">Country</label>
                <input
                  type="text"
                  value={deliveryCountry}
                  onChange={(e) => setDeliveryCountry(e.target.value)}
                  className="input"
                  placeholder="AU"
                />
              </div>
            </div>
          </div>

          {/* Delivery Date & Note */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold text-ink">Delivery Preferences</h2>

            <div>
              <label className="input-label">Requested Delivery Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="input"
                required
              />
            </div>

            <div>
              <label className="input-label">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Delivery instructions, site access notes, etc."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full text-base py-3"
          >
            {submitting ? "Placing Order..." : "Place Order"}
          </button>
        </form>

        {/* Order Summary */}
        <aside className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden sticky top-4">
            <div className="border-b border-surface-border bg-surface-overlay px-5 py-3">
              <h2 className="text-sm font-bold text-ink">Order Summary</h2>
            </div>

            <div className="p-5 space-y-4">
              {Object.entries(sellerGroups).map(([sellerEmail, group]) => {
                const sellerSubtotal = group.items.reduce(
                  (sum, item) => sum + item.unitPrice * item.quantity, 0
                );

                return (
                  <div key={sellerEmail}>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                      {group.sellerName}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const lineTotal = item.unitPrice * item.quantity;
                        return (
                          <div key={item.productId} className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-ink truncate">{item.name}</p>
                              <p className="text-xs text-ink-faint">
                                {item.quantity} {item.unitCode} × {formatCurrency(item.unitPrice, item.currency)}
                              </p>
                            </div>
                            <span className="text-sm font-medium tabular-nums text-ink shrink-0">
                              {formatCurrency(lineTotal, item.currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex justify-between border-t border-surface-border pt-2">
                      <span className="text-xs text-ink-muted">Subtotal</span>
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {formatCurrency(sellerSubtotal, primaryCurrency)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-surface-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">Grand Total</span>
                  <span className="text-lg font-bold tabular-nums text-ink">
                    {formatCurrency(grandTotal, primaryCurrency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-faint">Excludes applicable taxes</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
