import * as React from "react";
import { cn } from "@/lib/utils";

export interface OrderSummaryItem {
  key: string;
  name: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  thumbColor?: string;
  imageUrl?: string;
}

export interface OrderSummaryRecurring {
  active: boolean;
  startDate?: string; // ISO date or pretty
  startTime?: string;
}

export interface OrderSummaryProps {
  shop: { monogram: string; name: string };
  items: OrderSummaryItem[];
  subtotal: number;
  shippingHint?: string;
  shippingValue?: string;
  total: number;
  totalLabel?: string; // default: "Total"
  currency?: string;
  recurring?: OrderSummaryRecurring;
  className?: string;
}

function fmt(v: number, currency = "AUD") {
  const prefix = currency === "AUD" || currency === "USD" ? "$" : "";
  return `${prefix}${v.toFixed(2)}`;
}

/**
 * Sticky order summary sidebar shared across all 4 checkout steps.
 */
export function OrderSummary({
  shop,
  items,
  subtotal,
  shippingHint,
  shippingValue,
  total,
  totalLabel = "Total",
  currency = "AUD",
  recurring,
  className,
}: OrderSummaryProps) {
  return (
    <aside
      className={cn(
        "sticky top-4 border border-line rounded-[10px] bg-paper overflow-hidden",
        className
      )}
    >
      <div className="px-[18px] py-[14px] border-b border-line-2 flex items-center gap-[10px] bg-paper-2">
        <div className="w-[26px] h-[26px] rounded-[6px] bg-brand-surface text-brand-contrast grid place-items-center font-display font-bold text-[11.5px] tracking-[-.015em]">
          {shop.monogram}
        </div>
        <div className="font-display font-semibold text-[14px] tracking-[-.01em] text-ink">
          {shop.name}
        </div>
        <span className="ml-auto text-[11.5px] text-ink-3">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="px-[18px] py-2 max-h-[220px] overflow-y-auto">
        {items.map((item, idx) => (
          <div
            key={item.key}
            className={cn(
              "flex gap-[10px] items-center py-[10px]",
              idx > 0 && "border-t border-line-2"
            )}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="w-9 h-9 rounded-[6px] object-cover shrink-0"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-[6px] shrink-0"
                style={{ background: item.thumbColor ?? "var(--paper-2)" }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium leading-[1.3] text-ink truncate">
                {item.name}
              </div>
              {item.variantLabel && (
                <div className="text-[11px] text-ink-3 mt-[1px]">
                  {item.variantLabel} · {item.quantity}×
                </div>
              )}
            </div>
            <div className="font-mono text-[12px] font-medium pt-2 shrink-0 self-start">
              {fmt(item.unitPrice * item.quantity, currency)}
            </div>
          </div>
        ))}
      </div>

      <div className="px-[18px] py-[14px] border-t border-line-2">
        <div className="flex justify-between text-[13px] mb-[6px]">
          <span className="text-ink-3">Subtotal</span>
          <span className="font-mono font-medium">{fmt(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-[13px] mb-[6px]">
          <span className="text-ink-3">Shipping</span>
          <span
            className={cn(
              shippingValue
                ? "font-mono font-medium"
                : "text-ink-3 text-[12px]"
            )}
          >
            {shippingValue ?? shippingHint ?? "—"}
          </span>
        </div>
        <div className="flex justify-between items-center mt-[10px] pt-[10px] border-t border-line-2 font-display font-semibold text-[16px] tracking-[-.01em] text-ink">
          <span>{totalLabel}</span>
          <span className="font-mono font-semibold text-[16px]">
            {fmt(total, currency)}
          </span>
        </div>
      </div>

      {recurring?.active && (
        <div className="px-[18px] py-3 border-t border-line-2 bg-accent-soft text-[color:var(--s-paid-fg)] text-[12px] leading-[1.5] flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
            aria-hidden="true"
          >
            <path d="M4 12a8 8 0 0 1 14-5.3" />
            <path d="M20 4v5h-5" />
            <path d="M20 12a8 8 0 0 1-14 5.3" />
            <path d="M4 20v-5h5" />
          </svg>
          <span>
            Recurring monthly — starts{" "}
            <strong className="font-display font-semibold">
              {recurring.startDate ?? "—"}
              {recurring.startTime ? ` · ${recurring.startTime}` : ""}
            </strong>
          </span>
        </div>
      )}
    </aside>
  );
}
