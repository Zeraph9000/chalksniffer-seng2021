"use client";

type Stats = {
  actionRequired: number;
  outstandingValue: number;
  outstandingCurrency: string;
  overdue: number;
  monthToDate: number;
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-white p-5">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1.5 text-2xl font-bold font-mono text-ink">{value}</dd>
    </div>
  );
}

export function OrderStats({ stats }: { stats: Stats }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Requires Attention"
        value={String(stats.actionRequired)}
      />
      <StatCard
        label="Outstanding Value"
        value={formatCurrency(stats.outstandingValue, stats.outstandingCurrency)}
      />
      <StatCard
        label="Overdue"
        value={String(stats.overdue)}
      />
      <StatCard
        label="Month to Date"
        value={formatCurrency(stats.monthToDate, stats.outstandingCurrency)}
      />
    </dl>
  );
}
