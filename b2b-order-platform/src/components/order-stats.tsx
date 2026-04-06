"use client";

import { ShoppingBag, Clock, Truck, FileText } from "lucide-react";

type Stats = {
  total: number;
  actionRequired: number;
  awaitingReview: number;
  despatched: number;
  received: number;
  invoiced: number;
  paid: number;
};

const colorMap = {
  orange: { bg: "bg-orange-50 border border-orange-500", text: "text-orange-600", icon: "text-orange-500" },
  blue: { bg: "bg-blue-50 border border-blue-500", text: "text-blue-600", icon: "text-blue-500" },
  green: { bg: "bg-emerald-50 border border-emerald-500", text: "text-emerald-600", icon: "text-emerald-500" },
  purple: { bg: "bg-violet-50 border border-violet-500", text: "text-violet-600", icon: "text-violet-500" },
};

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: keyof typeof colorMap;
  icon: React.ReactNode;
}) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl ${c.bg} p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <dt className="text-sm font-medium text-ink-muted">{label}</dt>
          <dd className={`mt-1 text-2xl font-bold ${c.text}`}>{value}</dd>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center ${c.icon}`} aria-hidden="true">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function OrderStats({ stats }: { stats: Stats }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Orders" value={stats.total} color="orange" icon={<ShoppingBag size={20} />} />
      <StatCard label="Action Required" value={stats.actionRequired} color="blue" icon={<Clock size={20} />} />
      <StatCard label="In Transit" value={stats.despatched} color="green" icon={<Truck size={20} />} />
      <StatCard label="Awaiting Payment" value={stats.invoiced} color="purple" icon={<FileText size={20} />} />
    </dl>
  );
}
