"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart, type CartItem } from "@/lib/cart-context";
import {
  CheckoutHeader,
  CheckoutProgress,
} from "@/components/ledgr/checkout-chrome";
import { OrderSummary } from "@/components/ledgr/order-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function deriveMonogram(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || name.slice(0, 2).toUpperCase();
}

function itemKey(i: CartItem) {
  return `${i.productId}-${i.variantId}`;
}

function PaymentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [card, setCard] = useState({
    number: "4242 4242 4242 4242",
    expiry: "12 / 27",
    cvc: "123",
    postal: "2033",
    name: "",
  });

  const pi = params.get("pi") || "";
  const orderId = params.get("orderId") || "";
  const total = Number(params.get("total") || 0);
  const currency = params.get("currency") || "AUD";
  const token = params.get("t");

  const subtotal = cart.items.reduce(
    (s, i) => s + i.quantity * i.unitPriceSnapshot,
    0
  );
  const monogram = deriveMonogram(cart.storeName);
  const shopName = cart.storeName ?? "Your shop";

  async function pay() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/checkout/${pi}/pay`, { method: "POST" });
    if (res.ok) {
      cart.clearCart();
      const qs = new URLSearchParams({ orderId });
      if (token) qs.set("t", token);
      router.push(`/checkout/success?${qs.toString()}`);
    } else {
      setBusy(false);
      setErr("Payment failed (demo). Try again.");
    }
  }

  const summaryItems = cart.items.map((i) => ({
    key: itemKey(i),
    name: i.name,
    variantLabel: i.variantLabel,
    quantity: i.quantity,
    unitPrice: i.unitPriceSnapshot,
    imageUrl: i.imageUrl,
  }));

  const displayTotal = total > 0 ? total : subtotal;

  return (
    <main className="min-h-screen bg-paper-2 py-6 px-4">
      <div className="max-w-[1200px] mx-auto bg-paper border border-line rounded-[12px] overflow-hidden">
        <CheckoutHeader shop={{ monogram, name: shopName }} />
        <CheckoutProgress current={3} />

        <div className="grid grid-cols-[1.4fr_1fr] gap-9 px-7 pb-12 pt-3 items-start">
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-[26px] tracking-[-.022em] text-ink m-0">
              Payment
            </h1>
            <p className="text-[13px] text-ink-3 mt-[6px] mb-6">
              Review and confirm. Nothing is charged until you press Pay.
            </p>

            {/* Demo banner */}
            <div className="border border-[#d4b15a] bg-[#fdf5d9] text-[#5c4510] rounded-[8px] px-[14px] py-3 mb-[22px] flex items-center gap-[10px] text-[12.5px]">
              <strong className="font-display font-bold">Demo</strong>
              <span>
                — no real charge will be made. Any 16-digit test number (e.g.
                4242 4242 4242 4242) works.
              </span>
            </div>

            {/* Buyer recap */}
            <div className="bg-paper-2 border border-line rounded-[10px] px-[18px] py-4 mb-[22px] flex justify-between items-start gap-4">
              <div className="grid grid-cols-2 gap-5 flex-1">
                <div className="text-[12.5px] text-ink-2 leading-[1.55]">
                  <span className="block font-medium uppercase tracking-[.08em] text-[10.5px] text-ink-3 mb-1">
                    Ship to
                  </span>
                  {cart.items.length > 0 ? (
                    <>
                      <span className="text-ink">Your saved address</span>
                      <br />
                      <span className="text-ink-3 text-[12px]">
                        Confirmed on previous step
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="text-[12.5px] text-ink-2 leading-[1.55]">
                  <span className="block font-medium uppercase tracking-[.08em] text-[10.5px] text-ink-3 mb-1">
                    Contact
                  </span>
                  <span className="text-ink">Email on file</span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="text-[12.5px] text-ink font-medium underline underline-offset-[3px] shrink-0"
              >
                Edit
              </Link>
            </div>

            {/* Card details */}
            <section className="border border-line rounded-[10px] p-5 mb-[18px] bg-paper">
              <div className="font-display font-semibold text-[15px] tracking-[-.01em] mb-[14px]">
                Card details
              </div>

              <div className="flex flex-col gap-[6px] mb-3">
                <Label htmlFor="cardNumber">Card number</Label>
                <div className="flex items-center px-[14px] h-[42px] border border-line rounded-[8px] gap-[10px] focus-within:border-ink focus-within:ring-[3px] focus-within:ring-ink/[0.08] transition-colors">
                  <input
                    id="cardNumber"
                    value={card.number}
                    onChange={(e) =>
                      setCard({ ...card, number: e.target.value })
                    }
                    className="flex-1 border-0 outline-none bg-transparent font-mono text-[13.5px] tracking-[.05em] text-ink placeholder:text-ink-4"
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                  />
                  <span className="font-mono text-[10.5px] text-ink-3 border border-line rounded-[3px] px-[5px] py-[1px]">
                    VISA
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input
                    id="expiry"
                    className="font-mono"
                    value={card.expiry}
                    onChange={(e) =>
                      setCard({ ...card, expiry: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    className="font-mono"
                    value={card.cvc}
                    onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="postal">Postal</Label>
                  <Input
                    id="postal"
                    className="font-mono"
                    value={card.postal}
                    onChange={(e) =>
                      setCard({ ...card, postal: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[6px]">
                <Label htmlFor="nameOnCard">Name on card</Label>
                <Input
                  id="nameOnCard"
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                />
              </div>
            </section>

            {err && <p className="text-danger text-[12.5px] mb-3">{err}</p>}

            <div className="flex justify-between items-center mt-[22px] gap-3">
              <Link
                href="/checkout"
                className="text-ink-3 text-[13px] hover:text-ink transition-colors"
              >
                ← Back to details
              </Link>
              <Button type="button" size="lg" disabled={busy} onClick={pay}>
                Pay ${displayTotal.toFixed(2)} · Place order →
              </Button>
            </div>
          </div>

          <OrderSummary
            shop={{ monogram, name: shopName }}
            items={summaryItems}
            subtotal={subtotal}
            shippingValue="Free · AUS-wide"
            total={displayTotal}
            totalLabel="Today's charge"
            currency={currency}
          />
        </div>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper-2" />}>
      <PaymentInner />
    </Suspense>
  );
}
