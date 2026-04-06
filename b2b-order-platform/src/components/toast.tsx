"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, X } from "lucide-react";

export function Toast() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error === "unauthorized") {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 animate-slide-down rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2">
        <AlertCircle size={16} className="shrink-0 text-red-500" />
        <span>You don&apos;t have permission to access that page.</span>
        <button
          onClick={() => setVisible(false)}
          className="ml-2 shrink-0 text-red-400 hover:text-red-600 transition-colors"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
