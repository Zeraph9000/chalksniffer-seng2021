export const STATUS_CONFIG: Record<string, { label: string; badge: string; timeline: string }> = {
  "Action Required": {
    label: "Action Required",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    timeline: "bg-amber-400",
  },
  "Awaiting Review": {
    label: "Awaiting Review",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    timeline: "bg-slate-400",
  },
  Despatched: {
    label: "Despatched",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    timeline: "bg-blue-400",
  },
  Received: {
    label: "Received",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    timeline: "bg-emerald-400",
  },
  "Awaiting Payment": {
    label: "Awaiting Payment",
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
    timeline: "bg-purple-400",
  },
  Paid: {
    label: "Paid",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    timeline: "bg-emerald-400",
  },
  Placed: {
    label: "Placed",
    badge: "bg-orange-50 text-orange-700 border border-orange-200",
    timeline: "bg-orange-400",
  },
};

export function getStatusConfig(label: string) {
  return STATUS_CONFIG[label] || {
    label,
    badge: "bg-gray-50 text-gray-600 border border-gray-200",
    timeline: "bg-gray-400",
  };
}
