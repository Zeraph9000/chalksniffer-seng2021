"use client";

import { useEffect, useState } from "react";
import { OrderPaginated, OrderMapping } from "@/lib/types";
import { OrderRow } from "@/components/order-row";
import { OrderStats } from "@/components/order-stats";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";

type Stats = {
  actionRequired: number;
  outstandingValue: number;
  outstandingCurrency: string;
  overdue: number;
  monthToDate: number;
};

type OrderWithMapping = OrderPaginated & { mapping?: OrderMapping };

const PIPELINE_SECTIONS = [
  { key: "actionRequired", label: "Action Required", stripe: "bg-semantic-warning" },
  { key: "awaitingReview", label: "Awaiting Review", stripe: "bg-semantic-neutral" },
  { key: "despatched", label: "Despatched", stripe: "bg-semantic-info" },
  { key: "received", label: "Received", stripe: "bg-semantic-success" },
  { key: "invoiced", label: "Awaiting Payment", stripe: "bg-purple-600" },
  { key: "paid", label: "Paid", stripe: "bg-semantic-success" },
];

function getStatusLabel(mapping: OrderMapping | undefined, role: string): string {
  if (!mapping) return "Placed";
  if (mapping.status === "placed") {
    const myStatus = role === "buyer" ? mapping.buyerStatus : mapping.sellerStatus;
    return myStatus === "needs_review" ? "Action Required" : "Awaiting Review";
  }
  if (mapping.status === "invoiced") return "Awaiting Payment";
  if (mapping.status === "paid") return "Paid";
  return mapping.status.charAt(0).toUpperCase() + mapping.status.slice(1);
}

function getSectionKey(mapping: OrderMapping | undefined, role: string): string {
  if (!mapping) return "actionRequired";
  if (mapping.status === "placed") {
    const myStatus = role === "buyer" ? mapping.buyerStatus : mapping.sellerStatus;
    return myStatus === "needs_review" ? "actionRequired" : "awaitingReview";
  }
  if (mapping.status === "invoiced") return "invoiced";
  return mapping.status;
}

export default function DashboardPage() {
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [userName, setUserName] = useState("");
  const [orders, setOrders] = useState<OrderWithMapping[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [sessionRes, ordersRes, statsRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/orders?limit=100"),
        fetch("/api/orders/stats"),
      ]);

      if (!sessionRes.ok) {
        window.location.href = "/login";
        return;
      }

      const session = await sessionRes.json();
      setRole(session.role);
      setUserName(session.name || "");

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const orderList: OrderPaginated[] = data.orders || [];

        const mappingPromises = orderList.map((o) =>
          fetch(`/api/links?orderId=${o.id}`).then((r) => r.ok ? r.json() : null)
        );
        const mappings = await Promise.all(mappingPromises);

        setOrders(
          orderList.map((o, i) => ({ ...o, mapping: mappings[i] || undefined }))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const isBuyer = role === "buyer";

  const grouped: Record<string, OrderWithMapping[]> = {};
  for (const section of PIPELINE_SECTIONS) {
    grouped[section.key] = [];
  }
  for (const order of orders) {
    const key = getSectionKey(order.mapping, role || "buyer");
    if (grouped[key]) {
      grouped[key].push(order);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-surface-border bg-gradient-to-r from-accent-buyer/5 to-transparent p-6">
        <h1 className="text-2xl font-bold text-ink">
          {userName ? `Welcome, ${userName}` : isBuyer ? "Contractor Dashboard" : "Supplier Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isBuyer
            ? "Order materials, track deliveries, and manage invoices."
            : "Fulfil material orders, manage despatches, and invoice contractors."}
        </p>
      </div>

      {stats && <OrderStats stats={stats} />}

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description={isBuyer ? "Place your first material order to get started" : "Material orders from contractors will appear here"}
          actionLabel={isBuyer ? "Browse Marketplace" : undefined}
          actionHref={isBuyer ? "/marketplace" : undefined}
        />
      ) : (
        <div className="space-y-4">
          {PIPELINE_SECTIONS.map((section) => {
            const sectionOrders = grouped[section.key];
            if (!sectionOrders || sectionOrders.length === 0) return null;
            return (
              <div key={section.key} className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-surface-border bg-surface-overlay px-4 py-2">
                  <span className={`w-[3px] h-4 rounded-sm ${section.stripe}`} />
                  <span className="text-sm font-semibold text-ink-muted">{section.label}</span>
                  <span className="ml-auto text-xs font-mono text-ink-faint">{sectionOrders.length}</span>
                </div>
                {sectionOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    role={role || "buyer"}
                    statusLabel={getStatusLabel(order.mapping, role || "buyer")}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
