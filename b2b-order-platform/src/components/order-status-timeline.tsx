"use client";

import { OrderMapping } from "@/lib/types";

const STEPS = ["placed", "despatched", "received", "invoiced", "paid"] as const;
const LABELS = ["Order Placed", "Despatched", "Received", "Invoiced", "Paid"];
const STEP_COLORS = ["bg-accent-buyer", "bg-blue-400", "bg-emerald-400", "bg-purple-400", "bg-emerald-400"];
const STEP_RINGS = ["ring-orange-50", "ring-blue-50", "ring-emerald-50", "ring-purple-50", "ring-emerald-50"];

export function OrderStatusTimeline({ status }: { status: OrderMapping["status"] }) {
  const currentIndex = STEPS.indexOf(status);
  return (
    <nav className="card p-6" aria-label="Order progress">
      <ol className="flex items-center">
        {STEPS.map((step, i) => (
          <li key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${i < currentIndex ? "bg-emerald-50 text-emerald-600" : i === currentIndex ? `${STEP_COLORS[i]} text-white ring-4 ${STEP_RINGS[i]}` : "bg-surface-overlay text-ink-faint"}`} aria-current={i === currentIndex ? "step" : undefined}>
                {i < currentIndex ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (<span>{i + 1}</span>)}
              </div>
              <span className={`text-xs font-medium ${i <= currentIndex ? "text-ink" : "text-ink-faint"}`}>{LABELS[i]}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-3 mb-6 h-px flex-1" aria-hidden="true">
                <div className={`h-full ${i < currentIndex ? "bg-emerald-400" : "bg-surface-border"}`} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
