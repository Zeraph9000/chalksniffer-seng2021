"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart, type CartItem } from "@/lib/cart-context";
import {
  CheckoutHeader,
  CheckoutProgress,
} from "@/components/ledgr/checkout-chrome";
import { OrderSummary } from "@/components/ledgr/order-summary";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

function deriveMonogram(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || name.slice(0, 2).toUpperCase();
}

function itemKey(i: CartItem) {
  return `${i.productId}-${i.variantId}`;
}

function formatPrettyDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrettyTime(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  return d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CartPage() {
  const cart = useCart();
  const [recurringEnabled, setRecurringEnabled] = useState(false);

  // Default schedule: next month first day at 9:00.
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);
  const [startDate, setStartDate] = useState<string>(tomorrow);
  const [startTime, setStartTime] = useState<string>("09:00");

  const subtotal = cart.items.reduce(
    (s, i) => s + i.quantity * i.unitPriceSnapshot,
    0
  );
  const currency = cart.items[0]?.currency ?? "AUD";
  const monogram = deriveMonogram(cart.storeName);
  const shopName = cart.storeName ?? "Your shop";

  if (cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-paper-2 py-10 px-4">
        <div className="max-w-[720px] mx-auto bg-paper border border-line rounded-[12px]">
          <CheckoutHeader shop={{ monogram, name: shopName }} />
          <CheckoutProgress current={1} />
          <div className="px-8 pb-12 pt-2">
            <div className="rounded-[14px] border border-dashed border-line bg-paper p-14 text-center">
              <h3 className="font-display text-[20px] font-semibold tracking-[-.015em] text-ink m-0 mb-2">
                Your cart is empty
              </h3>
              <p className="m-0 mb-5 text-[13px] leading-[1.55] text-ink-3 max-w-[440px] mx-auto">
                Add items from a shop to start your order.
              </p>
              <Button asChild>
                <Link href="/">Browse shops</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const summaryItems = cart.items.map((i) => ({
    key: itemKey(i),
    name: i.name,
    variantLabel: i.variantLabel,
    quantity: i.quantity,
    unitPrice: i.unitPriceSnapshot,
    imageUrl: i.imageUrl,
  }));

  return (
    <main className="min-h-screen bg-paper-2 py-6 px-4">
      <div className="max-w-[1200px] mx-auto bg-paper border border-line rounded-[12px] overflow-hidden">
        <CheckoutHeader shop={{ monogram, name: shopName }} />
        <CheckoutProgress current={1} />

        <div className="grid grid-cols-[1.4fr_1fr] gap-9 px-7 pb-12 pt-3 items-start">
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-[26px] tracking-[-.022em] text-ink m-0">
              Review your cart
            </h1>
            <p className="text-[13px] text-ink-3 mt-[6px] mb-6 uppercase tracking-[.06em]">
              {shopName} · {cart.items.length}{" "}
              {cart.items.length === 1 ? "item" : "items"}
            </p>

            <div className="border border-line rounded-[10px] overflow-hidden bg-paper">
              {cart.items.map((item, idx) => (
                <div
                  key={itemKey(item)}
                  className={`grid grid-cols-[64px_1fr_auto_auto] gap-4 p-[18px] items-center ${
                    idx > 0 ? "border-t border-line-2" : ""
                  }`}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-16 h-16 rounded-[8px] object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-[8px] bg-paper-2 border border-line-2 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium tracking-[-.005em] text-ink">
                      {item.name}
                    </div>
                    <div className="text-[12px] text-ink-3 mt-[3px]">
                      {item.variantLabel}
                    </div>
                    <div className="inline-flex items-center border border-line rounded-[8px] mt-2 select-none">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          cart.updateQuantity(
                            item.productId,
                            item.variantId,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                        className="w-7 h-7 text-ink-2 hover:text-ink text-[14px] disabled:opacity-40"
                        disabled={item.quantity <= 1}
                      >
                        −
                      </button>
                      <span className="min-w-[22px] text-center font-mono text-[12.5px] font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          cart.updateQuantity(
                            item.productId,
                            item.variantId,
                            Math.min(item.stock, item.quantity + 1)
                          )
                        }
                        className="w-7 h-7 text-ink-2 hover:text-ink text-[14px] disabled:opacity-40"
                        disabled={item.quantity >= item.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-[14px] font-medium text-ink tabular-nums">
                    ${(item.quantity * item.unitPriceSnapshot).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      cart.removeItem(item.productId, item.variantId)
                    }
                    aria-label={`Remove ${item.name}`}
                    className="w-7 h-7 grid place-items-center text-ink-3 hover:text-ink hover:bg-paper-2 rounded-[6px] text-[15px] transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Recurring toggle */}
            <div
              className={`mt-5 border rounded-[10px] p-5 flex gap-4 items-start transition-colors ${
                recurringEnabled
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-paper"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-[8px] grid place-items-center shrink-0 mt-[2px] ${
                  recurringEnabled
                    ? "bg-accent text-paper"
                    : "bg-paper-2 text-ink-2"
                }`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12a8 8 0 0 1 14-5.3" />
                  <path d="M20 4v5h-5" />
                  <path d="M20 12a8 8 0 0 1-14 5.3" />
                  <path d="M4 20v-5h5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[14px] font-medium tracking-[-.005em] text-ink">
                    Make this a recurring order
                  </div>
                  <Switch
                    checked={recurringEnabled}
                    onCheckedChange={setRecurringEnabled}
                    aria-label="Enable recurring order"
                  />
                </div>
                <div className="text-[12.5px] text-ink-2 mt-[6px] leading-[1.5] max-w-[520px]">
                  {recurringEnabled ? (
                    <>
                      You&apos;ll be charged{" "}
                      <strong className="font-display font-semibold text-ink">
                        ${subtotal.toFixed(2)}
                      </strong>{" "}
                      today. Auto-charges repeat monthly, starting on the date
                      below. Pause, skip, or cancel anytime from {shopName}&apos;s
                      Recurring tab.
                    </>
                  ) : (
                    <>
                      Auto-charge and ship this same order monthly. You can pause,
                      skip, or cancel anytime.
                    </>
                  )}
                </div>

                {recurringEnabled && (
                  <div
                    className="mt-[14px] pt-[14px] flex items-center gap-[10px] flex-wrap"
                    style={{ borderTop: "1px solid rgba(10,74,52,.12)" }}
                  >
                    <label
                      htmlFor="recurring-start-date"
                      className="text-[11.5px] text-[color:var(--s-paid-fg)] font-medium uppercase tracking-[.08em]"
                    >
                      Recurring starts
                    </label>
                    <Input
                      id="recurring-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-[34px] w-auto px-[10px] font-mono text-[12.5px] border-[rgba(10,74,52,.22)] focus-visible:border-accent focus-visible:ring-accent/15"
                    />
                    <span className="text-ink-3 text-[12.5px]">at</span>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-[34px] w-auto px-[10px] font-mono text-[12.5px] border-[rgba(10,74,52,.22)] focus-visible:border-accent focus-visible:ring-accent/15"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-[22px] gap-3">
              <Link
                href={`/store/${cart.storeSlug ?? cart.storeId ?? ""}`}
                className="text-ink-3 text-[13px] hover:text-ink transition-colors"
              >
                ← Keep shopping
              </Link>
              <Button asChild size="lg">
                <Link href="/checkout">Continue to details →</Link>
              </Button>
            </div>
          </div>

          <OrderSummary
            shop={{ monogram, name: shopName }}
            items={summaryItems}
            subtotal={subtotal}
            shippingHint="Calculated at details"
            total={subtotal}
            totalLabel={recurringEnabled ? "Today's charge" : "Total"}
            currency={currency}
            recurring={
              recurringEnabled
                ? {
                    active: true,
                    startDate: formatPrettyDate(startDate),
                    startTime: formatPrettyTime(startTime),
                  }
                : undefined
            }
          />
        </div>
      </div>
    </main>
  );
}
