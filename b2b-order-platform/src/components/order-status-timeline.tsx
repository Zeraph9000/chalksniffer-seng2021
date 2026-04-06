"use client";

import { OrderMapping } from "@/lib/types";

const STEPS = ["placed", "despatched", "received", "invoiced"] as const;
const LABELS = ["Order Placed", "Despatched", "Received", "Invoiced"];

export function OrderStatusTimeline({ status }: { status: OrderMapping["status"] }) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="card p-6">
      <div className="flex items-center">
        {STEPS.map((step, i) => (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 ${
                  i < currentIndex
                    ? "bg-emerald-100 text-emerald-600"
                    : i === currentIndex
                    ? step === "placed"
                      ? "bg-[#e55a2d] text-white ring-4 ring-orange-100 shadow-sm"
                      : step === "invoiced"
                      ? "bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-sm"
                      : "bg-blue-500 text-white ring-4 ring-blue-100 shadow-sm"
                    : "bg-surface-overlay text-ink-faint"
                }`}
              >
                {i < currentIndex ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  i <= currentIndex ? "text-ink" : "text-ink-faint"
                }`}
              >
                {LABELS[i]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-3 mb-6 h-px flex-1">
                <div
                  className={`h-full transition-colors duration-500 ${
                    i < currentIndex ? "bg-emerald-400" : "bg-surface-border"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
