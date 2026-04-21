"use client";

import type { OrderStatus } from "@/lib/types";

const STEPS = ["placed", "despatched", "received", "invoiced", "paid"] as const;
type TimelineStep = (typeof STEPS)[number];
const LABELS = ["Order Placed", "Despatched", "Received", "Invoiced", "Paid"];
const STEP_COLORS = ["bg-accent-buyer", "bg-semantic-info", "bg-semantic-success", "bg-purple-600", "bg-semantic-success"];
const STEP_RINGS = ["ring-accent-primary-muted", "ring-semantic-info-muted", "ring-semantic-success-muted", "ring-purple-100", "ring-semantic-success-muted"];

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <nav className="card p-6" aria-label="Order progress">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-semantic-danger-muted px-3 py-1 text-sm font-medium text-semantic-danger">
            Cancelled
          </span>
          <span className="text-sm text-ink-faint">This order was cancelled and is no longer in progress.</span>
        </div>
      </nav>
    );
  }
  const currentIndex = STEPS.indexOf(status as TimelineStep);
  return (
    <nav className="card p-6" aria-label="Order progress">
      <ol className="flex items-center">
        {STEPS.map((step, i) => (
          <li key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${i < currentIndex ? "bg-semantic-success-muted text-semantic-success border border-emerald-300" : i === currentIndex ? `${STEP_COLORS[i]} text-white ring-4 ${STEP_RINGS[i]}` : "bg-surface-overlay text-ink-faint border border-surface-border"}`} aria-current={i === currentIndex ? "step" : undefined}>
                {i < currentIndex ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (<span>{i + 1}</span>)}
              </div>
              <span className={`text-xs font-medium ${i <= currentIndex ? "text-ink" : "text-ink-faint"}`}>{LABELS[i]}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-3 mb-6 h-px flex-1" aria-hidden="true">
                <div className={`h-full ${i < currentIndex ? "bg-semantic-success" : "bg-surface-border"}`} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
