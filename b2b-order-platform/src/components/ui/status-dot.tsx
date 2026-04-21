import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "open" | "low" | "oos" | "pending" | "info";

const toneClass: Record<Exclude<StatusTone, "oos">, string> = {
  open: "bg-accent",
  low: "bg-warn",
  pending: "bg-ink-4",
  info: "bg-[color:var(--s-despatched-fg)]",
};

export interface StatusDotProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "style"> {
  status: StatusTone;
  size?: number;
}

export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ status, size = 6, className, ...props }, ref) => {
    const style: React.CSSProperties = {
      width: `${size}px`,
      height: `${size}px`,
      ...(status === "oos" ? { background: "#741818" } : {}),
    };
    return (
      <span
        ref={ref}
        aria-label={`Status: ${status}`}
        role="img"
        style={style}
        className={cn(
          "inline-block rounded-full",
          status !== "oos" && toneClass[status],
          className
        )}
        {...props}
      />
    );
  }
);
StatusDot.displayName = "StatusDot";
