"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Pencil,
  Trash2,
  ArrowRight,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Frequency = "Daily" | "Weekly" | "Monthly";

type RecurringRow = {
  id: string;
  frequency?: Frequency;
  startDate?: string;
  storeId?: string | null;
  itemSummary?: string;
  order?: {
    id?: string;
    storeId?: string;
    anticipatedMonetaryTotal?: { payableAmount?: number | null };
    documentCurrencyCode?: string;
    orderLines?: Array<{ lineItem?: { item?: { name?: string } } }>;
  };
  orderInstances?: Array<{ id: string; scheduledDate: string }>;
  perCycleTotal?: number;
  name?: string;
};

export function RecurringList({
  storeId,
  storeSlug,
  storeName,
}: {
  storeId: string;
  storeSlug: string;
  storeName: string;
}) {
  const [rows, setRows] = useState<RecurringRow[] | null>(null);

  useEffect(() => {
    fetch("/api/orders/recurring")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RecurringRow[]) =>
        setRows(
          Array.isArray(data)
            ? data.filter((r) => r.storeId === storeId || r.order?.storeId === storeId)
            : []
        )
      )
      .catch(() => setRows([]));
  }, [storeId]);

  async function onDelete(id: string) {
    if (!confirm("Cancel this recurring order? This cannot be undone.")) return;
    const res = await fetch(`/api/orders/recurring/${id}`, { method: "DELETE" });
    if (res.ok) setRows((rs) => rs?.filter((r) => r.id !== id) ?? null);
  }

  const activeCount = rows?.length ?? 0;

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-[-.022em] m-0">
            Your recurring orders
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Scheduled with {storeName}. Edit the items or cancel anytime.
          </p>
        </div>
        {rows !== null && activeCount > 0 && (
          <span className="font-mono text-[12px] text-ink-3 bg-paper border border-line rounded-full px-2.5 py-0.5">
            {activeCount} active
          </span>
        )}
      </div>

      {rows === null ? (
        <LoadingSkeleton />
      ) : rows.length === 0 ? (
        <EmptyBlock storeSlug={storeSlug} storeName={storeName} />
      ) : (
        <ul className="list-none p-0 m-0">
          {rows.map((r) => (
            <li key={r.id}>
              <RecurringTemplateCard row={r} onDelete={() => onDelete(r.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecurringTemplateCard({
  row,
  onDelete,
}: {
  row: RecurringRow;
  onDelete: () => void;
}) {
  const title = row.name ?? row.itemSummary ?? "Recurring template";
  const freq = row.frequency ?? "Monthly";
  const sourceRef = row.order?.id;
  const subtitle = [
    row.id ? `RCR-${shortenId(row.id)}` : null,
    freq,
    sourceRef ? `created from ${sourceRef}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const perCycle =
    row.perCycleTotal ?? row.order?.anticipatedMonetaryTotal?.payableAmount ?? null;
  const perCycleText = perCycle != null ? `$${Number(perCycle).toFixed(2)}` : "—";
  const freqLabel = freq === "Daily" ? "day" : freq === "Weekly" ? "week" : "month";

  // Build next 5 instances (from API or synthesise from startDate + frequency).
  const instances = useMemo(() => {
    const raw = row.orderInstances ?? [];
    const sorted = [...raw]
      .filter((i) => i?.scheduledDate)
      .sort(
        (a, b) =>
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      )
      .slice(0, 5);
    if (sorted.length >= 1) return sorted;
    if (!row.startDate) return [];
    const start = new Date(row.startDate);
    const out: Array<{ id: string; scheduledDate: string }> = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      if (freq === "Daily") d.setDate(start.getDate() + i);
      else if (freq === "Weekly") d.setDate(start.getDate() + i * 7);
      else d.setMonth(start.getMonth() + i);
      out.push({ id: `${row.id}-${i}`, scheduledDate: d.toISOString() });
    }
    return out;
  }, [row.orderInstances, row.startDate, freq, row.id]);

  const nextInstance = instances[0];
  const itemNames =
    row.order?.orderLines
      ?.map((l) => l.lineItem?.item?.name)
      .filter((n): n is string => !!n) ?? [];
  const itemsHint = itemNames.length
    ? `${itemNames.length} ${itemNames.length === 1 ? "item" : "items"} · ${itemNames
        .slice(0, 3)
        .join(", ")}${itemNames.length > 3 ? "…" : ""}`
    : row.itemSummary ?? "Items in this template";

  return (
    <div className="bg-paper border border-line rounded-[14px] overflow-hidden mb-[18px]">
      {/* Header */}
      <div className="px-[22px] pt-[18px] pb-4 flex justify-between gap-5 items-start flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[42px] h-[42px] rounded-[10px] bg-accent-soft text-accent grid place-items-center flex-none">
            <RefreshCw className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="font-display text-[15.5px] font-semibold tracking-[-.01em] truncate">
              {title}
            </div>
            <div className="text-[12.5px] text-ink-3 mt-1 truncate">{subtitle}</div>
          </div>
        </div>
        <div className="text-right flex-none">
          <div className="text-[10.5px] uppercase tracking-[.12em] text-ink-3 font-medium">
            Next charge
          </div>
          <div className="font-display text-[18px] font-semibold tracking-[-.015em] mt-1">
            {nextInstance ? formatDateShort(nextInstance.scheduledDate) : "—"}
          </div>
          <div className="font-mono text-[11.5px] text-ink-3 mt-0.5">
            {nextInstance ? formatTime(nextInstance.scheduledDate) : ""}
          </div>
          <div className="font-mono text-[13px] text-ink mt-2.5">
            {perCycleText} / {freqLabel}
          </div>
        </div>
      </div>

      {/* Items row */}
      <div className="px-[22px] pb-4 flex items-center gap-2.5 flex-wrap">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-9 h-9 rounded-[7px] bg-paper-2 border border-line flex items-center justify-center text-ink-4 flex-none"
            aria-hidden
          >
            <Package className="h-4 w-4" />
          </div>
        ))}
        <span className="text-[12.5px] text-ink-3 ml-1.5">{itemsHint}</span>
      </div>

      {/* Timeline */}
      {instances.length > 0 && (
        <div className="mx-[22px] mb-4 p-5 bg-paper-2 border border-line rounded-[10px]">
          <div className="text-[10.5px] uppercase tracking-[.12em] text-ink-3 font-medium mb-3.5">
            Upcoming {instances.length}{" "}
            {instances.length === 1 ? "instance" : "instances"}
          </div>
          <div className="flex justify-between items-start relative">
            <span
              aria-hidden
              className="absolute left-3.5 right-3.5 top-[7px] h-[1.5px] bg-line z-0"
            />
            {instances.map((inst, idx) => {
              const isNext = idx === 0;
              return (
                <div
                  key={inst.id}
                  className="flex flex-col items-center gap-2 min-w-0 flex-1 relative z-10"
                >
                  <div
                    className={
                      isNext
                        ? "w-[14px] h-[14px] rounded-full bg-accent border-[1.5px] border-accent shadow-[0_0_0_4px_rgba(15,107,76,.14)]"
                        : "w-[14px] h-[14px] rounded-full bg-paper border-[1.5px] border-line"
                    }
                  />
                  <div
                    className={`font-display text-[12.5px] font-semibold tracking-[-.005em] ${
                      isNext ? "text-accent" : ""
                    }`}
                  >
                    {formatDateShort(inst.scheduledDate)}
                  </div>
                  <div className="font-mono text-[10px] text-ink-3">
                    {formatTime(inst.scheduledDate)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-line-2 bg-paper px-5 py-3.5 flex justify-between items-center gap-2.5">
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="gap-1.5 text-danger border-line hover:border-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
        <span className="font-mono text-[12.5px] text-ink-3">
          Next charge: {perCycleText}
        </span>
      </div>
    </div>
  );
}

function EmptyBlock({
  storeSlug,
  storeName,
}: {
  storeSlug: string;
  storeName: string;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-line bg-paper px-6 py-14 text-center">
      <div className="mx-auto mb-[18px] grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
        <RefreshCw className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="font-display text-[20px] font-semibold tracking-[-.015em] m-0 mb-2">
        No recurring orders with {storeName} yet
      </h3>
      <p className="m-0 mb-5 text-[13px] leading-[1.55] text-ink-3 max-w-[440px] mx-auto">
        When you place an order, tick &ldquo;Make this recurring&rdquo; at cart
        review, or turn a past order into a template from its Order Detail
        page. You can edit or cancel anytime.
      </p>
      <Button asChild>
        <Link href={`/store/${storeSlug}`} className="gap-2">
          Browse the shop
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-paper border border-line rounded-[14px] px-6 py-8 text-[13px] text-ink-3">
      Loading recurring orders…
    </div>
  );
}

function shortenId(id: string) {
  return id.slice(-4).toUpperCase();
}

function formatDateShort(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
