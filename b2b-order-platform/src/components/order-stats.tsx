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

type StatCardProps = {
  label: string;
  value: string;
  bgColor: string;
  valueColor: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, bgColor, valueColor, icon }: StatCardProps) {
  return (
    <div className={`rounded-lg border border-surface-border ${bgColor} p-5`}>
      <div className="flex items-center justify-between">
        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
        <span className="text-ink-faint">{icon}</span>
      </div>
      <dd className={`mt-2 text-2xl font-bold font-mono ${valueColor}`}>{value}</dd>
    </div>
  );
}

export function OrderStats({ stats }: { stats: Stats }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Requires Attention"
        value={String(stats.actionRequired)}

        bgColor="bg-semantic-warning-muted"
        valueColor={stats.actionRequired > 0 ? "text-semantic-warning" : "text-ink"}
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L18 17H2L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M10 8V11M10 14V14.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
      />
      <StatCard
        label="Outstanding Value"
        value={formatCurrency(stats.outstandingValue, stats.outstandingCurrency)}

        bgColor="bg-semantic-info-muted"
        valueColor="text-ink"
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 6V14M7.5 8.5H11.5C12.3 8.5 13 9.1 13 9.75C13 10.4 12.3 11 11.5 11H8.5C7.7 11 7 11.6 7 12.25C7 12.9 7.7 13.5 8.5 13.5H12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        }
      />
      <StatCard
        label="Overdue"
        value={String(stats.overdue)}

        bgColor="bg-semantic-danger-muted"
        valueColor={stats.overdue > 0 ? "text-semantic-danger" : "text-ink"}
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 6V10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
      />
      <StatCard
        label="Month to Date"
        value={formatCurrency(stats.monthToDate, stats.outstandingCurrency)}

        bgColor="bg-semantic-success-muted"
        valueColor="text-semantic-success"
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 14L7 10L10 13L17 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 6H17V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
      />
    </dl>
  );
}
