import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-dashed border-line bg-paper p-14 text-center",
        className
      )}
    >
      {icon && (
        <div className="mx-auto mb-[18px] grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
          {icon}
        </div>
      )}
      <h3 className="font-display text-[20px] font-semibold tracking-[-.015em] text-ink m-0 mb-2">
        {title}
      </h3>
      <p className="m-0 mb-5 text-[13px] leading-[1.55] text-ink-3 max-w-[440px] mx-auto">{body}</p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
