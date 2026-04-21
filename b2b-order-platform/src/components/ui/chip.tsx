import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { StatusDot, type StatusTone } from "@/components/ui/status-dot";

const chipVariants = cva(
  "inline-flex items-center gap-[6px] h-[22px] px-[10px] rounded-full text-[11.5px] font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        placed: "bg-s-placed-bg text-s-placed-fg",
        paid: "bg-s-paid-bg text-s-paid-fg",
        despatched: "bg-s-despatched-bg text-s-despatched-fg",
        received: "bg-s-received-bg text-s-received-fg",
        invoiced: "bg-s-invoiced-bg text-s-invoiced-fg",
        cancelled: "bg-s-cancelled-bg text-s-cancelled-fg",
        scheduled: "bg-s-scheduled-bg text-s-scheduled-fg",
        draft: "bg-s-draft-bg text-s-draft-fg",
        sent: "bg-s-sent-bg text-s-sent-fg",
        neutral: "bg-paper-2 text-ink-2 border border-line",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  withDot?: boolean;
  dotTone?: StatusTone;
}

export function Chip({ className, tone, withDot, dotTone, children, ...props }: ChipProps) {
  const inferredDotTone: StatusTone =
    dotTone ??
    (tone === "cancelled"
      ? "oos"
      : tone === "placed"
        ? "low"
        : tone === "despatched" || tone === "sent"
          ? "info"
          : tone === "draft" || tone === "scheduled"
            ? "pending"
            : "open");
  return (
    <span className={cn(chipVariants({ tone, className }))} {...props}>
      {withDot && <StatusDot status={inferredDotTone} size={6} />}
      {children}
    </span>
  );
}
