"use client";

import { useRouter } from "next/navigation";
import { OrderPaginated } from "@/lib/types";
import { StatusBadge } from "./status-badge";

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function OrderRow({
  order,
  role,
  statusLabel,
}: {
  order: OrderPaginated;
  role: "buyer" | "seller";
  statusLabel: string;
}) {
  const router = useRouter();
  const counterparty = role === "buyer" ? order.sellerName : order.buyerName;
  const truncatedId = order.id.slice(0, 18);

  function handleClick() {
    router.push(`/orders/${order.id}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className="flex items-center justify-between px-4 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer border-b border-surface-border last:border-b-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/30"
      aria-label={`Order from ${counterparty}, ${order.payableAmount} ${order.documentCurrencyCode}, status ${statusLabel}`}
    >
      <div>
        <p className="text-sm font-semibold text-ink">{counterparty}</p>
        <p className="text-xs text-ink-faint font-mono">
          {truncatedId} · {formatDate(order.issueDate)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold font-mono text-ink">
          {order.payableAmount} {order.documentCurrencyCode}
        </span>
        <StatusBadge label={statusLabel} />
      </div>
    </div>
  );
}
