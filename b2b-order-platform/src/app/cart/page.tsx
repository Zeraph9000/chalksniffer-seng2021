"use client";

import { useCart } from "@/lib/cart-context";
import { EmptyState } from "@/components/empty-state";
import { Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Your Cart</h1>
        <EmptyState
          title="Your cart is empty"
          description="Browse the marketplace to add materials to your cart"
          actionLabel="Browse Marketplace"
          actionHref="/marketplace"
        />
      </div>
    );
  }

  // Group items by seller email
  const sellerGroups: Record<string, { sellerName: string; items: typeof items }> = {};
  for (const item of items) {
    if (!sellerGroups[item.sellerEmail]) {
      sellerGroups[item.sellerEmail] = { sellerName: item.sellerName, items: [] };
    }
    sellerGroups[item.sellerEmail].items.push(item);
  }

  const grandTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const primaryCurrency = items[0]?.currency || "AUD";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Your Cart</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {items.length} item{items.length !== 1 ? "s" : ""} from {Object.keys(sellerGroups).length} supplier{Object.keys(sellerGroups).length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/checkout" className="btn-primary flex items-center gap-2">
          <ShoppingBag size={16} />
          Proceed to Checkout
        </Link>
      </div>

      {/* Seller Groups */}
      <div className="space-y-4">
        {Object.entries(sellerGroups).map(([sellerEmail, group]) => {
          const sellerSubtotal = group.items.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity, 0
          );

          return (
            <div key={sellerEmail} className="card overflow-hidden">
              {/* Seller header */}
              <div className="flex items-center justify-between border-b border-surface-border bg-surface-overlay px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{group.sellerName}</p>
                  <p className="text-xs text-ink-faint">{sellerEmail}</p>
                </div>
                <p className="text-sm text-ink-muted">
                  Subtotal:{" "}
                  <span className="font-semibold text-ink tabular-nums">
                    {formatCurrency(sellerSubtotal, primaryCurrency)}
                  </span>
                </p>
              </div>

              {/* Items */}
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Product</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">Unit Price</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">Quantity</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">Line Total</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => {
                    const lineTotal = item.unitPrice * item.quantity;
                    return (
                      <tr key={item.productId} className="border-b border-surface-border last:border-0">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-ink">{item.name}</p>
                          <p className="text-xs text-ink-faint">{item.unitCode}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm tabular-nums text-ink-muted">
                            {formatCurrency(item.unitPrice, item.currency)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <input
                              type="number"
                              min={1}
                              max={item.stock}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, Math.min(Number(e.target.value), item.stock));
                                updateQuantity(item.productId, val);
                              }}
                              className="input w-20 text-center"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-semibold tabular-nums text-ink">
                            {formatCurrency(lineTotal, item.currency)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-ink-faint hover:text-red-600 hover:bg-red-50"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Grand Total */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-ink">Grand Total</p>
          <p className="text-xl font-bold tabular-nums text-ink">
            {formatCurrency(grandTotal, primaryCurrency)}
          </p>
        </div>
        <p className="mt-1 text-xs text-ink-faint">
          Excludes applicable taxes and delivery charges
        </p>
        <div className="mt-4 flex justify-end">
          <Link href="/checkout" className="btn-primary flex items-center gap-2">
            <ShoppingBag size={16} />
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
