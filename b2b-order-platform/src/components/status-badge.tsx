import { getStatusConfig } from "@/lib/status-colors";

export function StatusBadge({ label, size = "sm" }: { label: string; size?: "sm" | "md" }) {
  const config = getStatusConfig(label);
  const sizeClass = size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.badge}`}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
