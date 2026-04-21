"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";

export default function Checkout() {
  const cart = useCart();
  const router = useRouter();
  const [asGuest, setAsGuest] = useState(true);
  const [form, setForm] = useState({
    email: "", name: "", phone: "",
    streetName: "", cityName: "", postalZone: "", country: "AU",
    note: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [frequency, setFrequency] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");
  const [startDate, setStartDate] = useState<string>(tomorrow);

  useEffect(() => {
    if (cart.items.length === 0) router.push("/cart");
  }, [cart.items.length, router]);

  useEffect(() => {
    fetch("/api/buyer/me").then(async (r) => {
      const profile = await r.json();
      if (!profile) return;
      setForm((f) => ({
        ...f,
        email: f.email || profile.email || "",
        name: f.name || profile.name || "",
        phone: f.phone || profile.phone || "",
        streetName: f.streetName || profile.address?.streetName || "",
        cityName: f.cityName || profile.address?.cityName || "",
        postalZone: f.postalZone || profile.address?.postalZone || "",
        country: f.country || profile.address?.country || "AU",
      }));
      // Buyer is signed in — default asGuest to false so submit attaches buyerId.
      setAsGuest(false);
    }).catch(() => { /* ignore */ });
  }, []);

  if (cart.items.length === 0) return null;

  const subtotal = cart.items.reduce((s, i) => s + i.quantity * i.unitPriceSnapshot, 0);

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.quantity,
          unitPriceSnapshot: i.unitPriceSnapshot,
        })),
        buyer: {
          email: form.email,
          name: form.name,
          phone: form.phone,
          address: {
            streetName: form.streetName,
            cityName: form.cityName,
            postalZone: form.postalZone,
            country: form.country,
          },
        },
        note: form.note,
        asGuest,
        ...(recurringEnabled ? { recurring: { frequency, startDate } } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.message || data.error);
      setBusy(false);
      return;
    }
    const qs = new URLSearchParams({
      pi: data.paymentIntentId,
      orderId: data.orderId,
      total: String(data.total),
      currency: data.currency,
    });
    if (data.guestAccessToken) qs.set("t", data.guestAccessToken);
    router.push(`/checkout/payment?${qs.toString()}`);
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <div className="mb-6 flex gap-2">
        <button type="button" onClick={() => setAsGuest(true)} className={`px-4 py-2 border rounded ${asGuest ? "bg-black text-white" : ""}`}>
          Continue as guest
        </button>
        <button type="button" onClick={() => setAsGuest(false)} className={`px-4 py-2 border rounded ${!asGuest ? "bg-black text-white" : ""}`}>
          Log in / Create account
        </button>
      </div>

      <div className="space-y-3">
        {(["email", "name", "phone"] as const).map((f) => (
          <input
            key={f}
            placeholder={f}
            value={form[f]}
            onChange={(e) => setForm({ ...form, [f]: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        ))}
        <input placeholder="Street" value={form.streetName} onChange={(e) => setForm({ ...form, streetName: e.target.value })} className="w-full border rounded px-3 py-2" />
        <div className="grid grid-cols-3 gap-2">
          <input placeholder="City" value={form.cityName} onChange={(e) => setForm({ ...form, cityName: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Postal" value={form.postalZone} onChange={(e) => setForm({ ...form, postalZone: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="border rounded px-3 py-2" />
        </div>
        <textarea
          placeholder="Note to seller (optional)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="border rounded p-4 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={recurringEnabled}
            onChange={(e) => setRecurringEnabled(e.target.checked)}
          />
          <span className="font-semibold">Make this a recurring order</span>
        </label>
        {recurringEnabled && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              Frequency
              <select
                className="block w-full border rounded px-2 py-1"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "Daily" | "Weekly" | "Monthly")}
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </label>
            <label className="block">
              Start date
              <input
                type="date"
                className="block w-full border rounded px-2 py-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div>Subtotal: <strong>${subtotal.toFixed(2)}</strong></div>
        <button type="button" disabled={busy} onClick={submit} className="px-6 py-2 bg-black text-white rounded disabled:opacity-50">
          Continue to payment
        </button>
      </div>
      {err && <p className="text-red-600 mt-4">{err}</p>}
    </main>
  );
}
