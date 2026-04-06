export const STATUS_CONFIG: Record<string, { label: string; badge: string; timeline: string }> = {
  "Action Required": {
    label: "Action Required",
    badge: "bg-semantic-warning-muted text-semantic-warning border border-amber-300",
    timeline: "bg-semantic-warning",
  },
  "Awaiting Review": {
    label: "Awaiting Review",
    badge: "bg-semantic-neutral-muted text-semantic-neutral border border-slate-300",
    timeline: "bg-semantic-neutral",
  },
  Despatched: {
    label: "Despatched",
    badge: "bg-semantic-info-muted text-semantic-info border border-blue-300",
    timeline: "bg-semantic-info",
  },
  Received: {
    label: "Received",
    badge: "bg-semantic-success-muted text-semantic-success border border-emerald-300",
    timeline: "bg-semantic-success",
  },
  "Awaiting Payment": {
    label: "Awaiting Payment",
    badge: "bg-purple-100 text-purple-800 border border-purple-300",
    timeline: "bg-purple-500",
  },
  Paid: {
    label: "Paid",
    badge: "bg-semantic-success-muted text-semantic-success border border-emerald-300",
    timeline: "bg-semantic-success",
  },
  Placed: {
    label: "Placed",
    badge: "bg-accent-primary-muted text-accent-primary border border-orange-300",
    timeline: "bg-accent-primary",
  },
};

export function getStatusConfig(label: string) {
  return STATUS_CONFIG[label] || {
    label,
    badge: "bg-semantic-neutral-muted text-semantic-neutral border border-slate-300",
    timeline: "bg-semantic-neutral",
  };
}
