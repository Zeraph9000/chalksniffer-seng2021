import * as React from "react";
import { cn } from "@/lib/utils";

export type KpiTileTone = "orders" | "sold" | "recur" | "ink";

const toneClass: Record<KpiTileTone, string> = {
  orders: "bg-s-despatched-bg text-s-despatched-fg",
  sold: "bg-warn-bg text-warn",
  recur: "bg-accent-soft text-accent",
  ink: "bg-paper-2 text-ink-2",
};

export interface KpiTileProps {
  icon: React.ReactNode;
  tone?: KpiTileTone;
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  className?: string;
}

export function KpiTile({ icon, tone = "ink", label, value, sublabel, className }: KpiTileProps) {
  return (
    <div
      className={cn(
        "bg-paper border border-line rounded-[14px] px-[22px] py-5 flex items-start gap-3.5",
        className
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-[10px] grid place-items-center shrink-0",
          toneClass[tone]
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-[0.12em] text-ink-3 font-medium">
          {label}
        </div>
        <div className="font-display text-[22px] font-semibold tracking-[-.02em] mt-1 text-ink">
          {value}
        </div>
        {sublabel ? (
          <div className="text-[11.5px] text-ink-3 mt-[3px] truncate">{sublabel}</div>
        ) : null}
      </div>
    </div>
  );
}
