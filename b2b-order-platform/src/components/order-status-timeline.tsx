"use client";

import { OrderMapping } from "@/lib/types";

const STEPS = ["placed", "despatched", "received", "invoiced", "paid"] as const;
const LABELS = ["Order Placed", "Despatched", "Received", "Invoiced", "Paid"];
const STEP_COLORS = ["bg-[#e55a2d]", "bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-emerald-500"];
const STEP_RINGS = ["ring-orange-100", "ring-sky-100", "ring-emerald-100", "ring-violet-100", "ring-emerald-100"];

export function OrderStatusTimeline({ status }: { status: OrderMapping["status"] }) {
  const currentIndex = STEPS.indexOf(status);
  return (
    <nav className="card p-6" aria-label="Order progress">
      <ol className="flex items-center">
        {STEPS.map((step, i) => (
          <li key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 ${i < currentIndex ? "bg-emerald-100 text-emerald-600" : i === currentIndex ? `${STEP_COLORS[i]} text-white ring-4 ${STEP_RINGS[i]} shadow-sm` : "bg-surface-overlay text-ink-faint"}`} aria-current={i === currentIndex ? "step" : undefined}>
                {i < currentIndex ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (<span>{i + 1}</span>)}
              </div>
              <span className={`text-xs font-medium ${i <= currentIndex ? "text-ink" : "text-ink-faint"}`}>{LABELS[i]}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-3 mb-6 h-px flex-1" aria-hidden="true">
                <div className={`h-full transition-colors duration-500 ${i < currentIndex ? "bg-emerald-400" : "bg-surface-border"}`} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
