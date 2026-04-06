"use client";

import { useEffect, useState } from "react";
import { OrderPaginated, OrderMapping } from "@/lib/types";
import { OrderRow } from "@/components/order-row";
import { OrderStats } from "@/components/order-stats";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Download } from "lucide-react";

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "placed", label: "Placed" },
  { id: "despatched", label: "Despatched" },
  { id: "received", label: "Received" },
  { id: "invoiced", label: "Invoiced" },
  { id: "paid", label: "Paid" },
];

type Stats = {
  total: number;
  actionRequired: number;
  awaitingReview: number;
  despatched: number;
  received: number;
  invoiced: number;
  paid: number;
};

type OrderWithMapping = OrderPaginated & { mapping?: OrderMapping };

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

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithMapping[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const statusParam = statusFilter ? `&status=${statusFilter}` : "";
      const [ordersRes, sessionRes, statsRes] = await Promise.all([
        fetch(`/api/orders?limit=${limit}&offset=${offset}${statusParam}`),
        fetch("/api/auth/session"),
        fetch("/api/orders/stats"),
      ]);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const orderList: OrderPaginated[] = data.orders || [];
        setTotal(data.totalOrders || 0);

        const mappingPromises = orderList.map((o) =>
          fetch(`/api/links?orderId=${o.id}`).then((r) => r.ok ? r.json() : null)
        );
        const mappings = await Promise.all(mappingPromises);
        setOrders(orderList.map((o, i) => ({ ...o, mapping: mappings[i] || undefined })));
      }
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRole(session.role);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      setLoading(false);
    }
    load();
  }, [offset, statusFilter]);

  if (loading) return <LoadingSpinner message="Loading orders..." />;

  const isBuyer = role === "buyer";

  if (orders.length === 0 && offset === 0 && !statusFilter) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Orders</h1>
        <EmptyState
          title="No orders found"
          description={isBuyer ? "Place your first material order" : "Material orders from contractors will appear here"}
          actionLabel={isBuyer ? "Create Order" : undefined}
          actionHref={isBuyer ? "/orders/create" : undefined}
        />
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isBuyer ? "Your material orders across all sites." : "Incoming material orders from contractors."}
          </p>
        </div>
        <a href="/api/orders/csv" className="btn-ghost bg-white text-ink flex items-center gap-2">
          <Download size={16} />
          Export CSV
        </a>
      </div>

      {stats && <OrderStats stats={stats} />}

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setStatusFilter(tab.id); setOffset(0); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              statusFilter === tab.id
                ? "bg-accent-primary text-white"
                : "bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders match this filter"
          description="Try a different status filter"
        />
      ) : (
        <div className="card overflow-hidden">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              role={(role as "buyer" | "seller") || "buyer"}
              statusLabel={getStatusLabel(order.mapping, role || "buyer")}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-muted">
            Page {currentPage} of {totalPages} · {total} orders
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="btn-ghost disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="btn-ghost disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
