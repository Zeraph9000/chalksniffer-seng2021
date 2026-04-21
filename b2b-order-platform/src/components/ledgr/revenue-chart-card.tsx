"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type RevenuePeriod = "7D" | "30D" | "90D";

export interface RevenueChartCardProps {
  /** Revenue amount in dollars (not cents) */
  revenue: number;
  /** Previous period revenue in dollars */
  previousRevenue: number;
  /** Delta percent, e.g. 18 for +18%. If omitted it's computed. */
  deltaPercent?: number;
  /** 30 bar heights, 1..100. */
  bars: number[];
  /** Axis labels, evenly spaced */
  axisLabels?: string[];
  /** Period toggle selection (visual only). */
  defaultPeriod?: RevenuePeriod;
  className?: string;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function RevenueChartCard({
  revenue,
  previousRevenue,
  deltaPercent,
  bars,
  axisLabels = ["Mar 23", "Apr 1", "Apr 8", "Apr 15", "Apr 22"],
  defaultPeriod = "30D",
  className,
}: RevenueChartCardProps) {
  const [period, setPeriod] = React.useState<RevenuePeriod>(defaultPeriod);

  const computedDelta =
    deltaPercent !== undefined
      ? deltaPercent
      : previousRevenue > 0
        ? Math.round(((revenue - previousRevenue) / previousRevenue) * 100)
        : 0;
  const up = computedDelta >= 0;

  const maxBar = Math.max(1, ...bars);
  const lastIdx = bars.length - 1;

  return (
    <div
      className={cn(
        "bg-paper border border-line rounded-[14px] px-6 py-[22px]",
        className
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-ink-3 font-medium">
            Revenue · last 30 days
          </div>
          <div className="font-display text-[32px] font-bold tracking-[-.025em] mt-1.5 text-ink">
            {formatMoney(revenue)}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ml-2 align-[4px]",
                up
                  ? "bg-accent-soft text-[color:var(--s-paid-fg)]"
                  : "bg-[#fbe8e8] text-[#741818]"
              )}
            >
              {up ? "↑" : "↓"} {Math.abs(computedDelta)}%
            </span>
          </div>
          <div className="text-[12px] text-ink-3 mt-1.5">
            vs {formatMoney(previousRevenue)} in the previous 30 days
          </div>
        </div>

        <ToggleGroup
          type="single"
          size="sm"
          value={period}
          onValueChange={(v) => v && setPeriod(v as RevenuePeriod)}
          className="rounded-[8px]"
        >
          <ToggleGroupItem value="7D" className="font-mono text-[12px]">7D</ToggleGroupItem>
          <ToggleGroupItem value="30D" className="font-mono text-[12px]">30D</ToggleGroupItem>
          <ToggleGroupItem value="90D" className="font-mono text-[12px]">90D</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-[18px] h-[160px] flex items-end gap-1 relative">
        {bars.map((h, i) => {
          // True zero stays zero; tiny-but-nonzero bars get a 3% floor so they remain visible.
          const pct = h <= 0 ? 0 : Math.max(3, Math.round((h / maxBar) * 100));
          const isLast = i === lastIdx;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t-[3px] bg-accent relative transition-colors hover:bg-[color:var(--s-paid-fg)]"
              )}
              style={{ height: `${pct}%` }}
            >
              {isLast && h > 0 ? (
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 -top-[6px] w-2 h-2 rounded-full bg-accent ring-2 ring-paper"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10.5px] text-ink-4 font-mono">
        {axisLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
