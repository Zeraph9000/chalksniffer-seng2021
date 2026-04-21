import * as React from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

export interface CheckoutHeaderProps {
  shop: {
    monogram: string;
    name: string;
  };
  className?: string;
}

/**
 * Minimal checkout chrome header (replaces StoreTopNav during checkout).
 * - 3px brand strip at top
 * - 60px tall, border-bottom line-2
 * - Left: shop monogram + name
 * - Right: "Secure checkout · via Ledgr"
 */
export function CheckoutHeader({ shop, className }: CheckoutHeaderProps) {
  return (
    <header
      className={cn(
        "relative h-[60px] flex items-center justify-between px-7 border-b border-line-2 bg-paper",
        className
      )}
    >
      <div className="absolute left-0 top-0 w-full h-[3px] bg-brand" />
      <div className="inline-flex items-center gap-[10px]">
        <div className="w-[30px] h-[30px] rounded-[7px] bg-brand-surface text-brand-contrast grid place-items-center font-display font-bold text-[12px] tracking-[-.015em]">
          {shop.monogram}
        </div>
        <div className="font-display font-semibold text-[16px] tracking-[-.02em] text-ink">
          {shop.name}
        </div>
      </div>
      <div className="inline-flex items-center gap-2 text-[11.5px] text-ink-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 1 1 8 0v3" />
        </svg>
        <span>
          Secure checkout · via <Wordmark size="sm" className="text-[13px] align-baseline" />
        </span>
      </div>
    </header>
  );
}

export type CheckoutStep = 1 | 2 | 3 | 4;

export interface CheckoutProgressProps {
  current: CheckoutStep;
  className?: string;
}

const STEPS: { n: CheckoutStep; label: string }[] = [
  { n: 1, label: "Cart" },
  { n: 2, label: "Details" },
  { n: 3, label: "Payment" },
  { n: 4, label: "Done" },
];

/**
 * 4-step checkout progress stepper.
 * - Steps < current: ✓ on bg-accent
 * - Step === current: number on bg-ink text-paper
 * - Steps > current: number on bordered outline
 * - Connectors: 56px × 1.5px, bg-accent if lower step is done, else bg-line
 */
export function CheckoutProgress({ current, className }: CheckoutProgressProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-center px-6 pt-[26px] pb-5",
        className
      )}
    >
      {STEPS.map((step, idx) => {
        const isDone = step.n < current;
        const isActive = step.n === current;
        const isPending = step.n > current;
        const showConnector = idx > 0;
        const connectorDone = step.n <= current;

        return (
          <React.Fragment key={step.n}>
            {showConnector && (
              <div
                className={cn(
                  "h-[1.5px] w-[56px] rounded-[2px] mx-1 mt-[13px]",
                  connectorDone ? "bg-accent" : "bg-line"
                )}
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col items-center gap-2 min-w-[100px]">
              <div
                className={cn(
                  "w-[26px] h-[26px] rounded-full grid place-items-center font-mono font-medium text-[12px] border-[1.5px]",
                  isDone && "bg-accent border-accent text-paper",
                  isActive && "bg-ink border-ink text-paper",
                  isPending && "bg-paper border-line text-ink-3"
                )}
              >
                {isDone ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m4 12 5 5 11-11" />
                  </svg>
                ) : (
                  step.n
                )}
              </div>
              <div
                className={cn(
                  "text-[11px] uppercase tracking-[.12em] font-medium",
                  isDone || isActive ? "text-ink" : "text-ink-3"
                )}
              >
                {step.label}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
