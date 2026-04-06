"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { OrderPaginated } from "@/lib/types";
import { Download } from "lucide-react";

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "placed", label: "Placed" },
  { id: "despatched", label: "Despatched" },
  { id: "received", label: "Received" },
  { id: "invoiced", label: "Invoiced" },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderPaginated[]>([]);
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
      const [ordersRes, sessionRes] = await Promise.all([
        fetch(`/api/orders?limit=${limit}&offset=${offset}${statusParam}`),
        fetch("/api/auth/session"),
      ]);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
        setTotal(data.totalOrders || 0);
      }
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRole(session.role);
      }
      setLoading(false);
    }
    load();
  }, [offset, statusFilter]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-ink-muted">Loading orders...</div>;
  }

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

  function formatDate(value: unknown): string {
    if (!value) return "—";
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  }

  const columns = [
    { key: "id" as const, label: "Order ID" },
    {
      key: "issueDate" as const,
      label: "Issue Date",
      render: (val: unknown) => formatDate(val),
    },
    { key: "buyerName" as const, label: "Buyer" },
    { key: "sellerName" as const, label: "Seller" },
    {
      key: "payableAmount" as const,
      label: "Amount",
      render: (val: unknown, row: OrderPaginated) =>
        `${val} ${row.documentCurrencyCode}`,
    },
    {
      key: "createdAt" as const,
      label: "Created",
      render: (val: unknown) => formatDate(val),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isBuyer ? "Your material orders across all sites." : "Incoming material orders from contractors."}
          </p>
        </div>
        <a href="/api/orders/csv" className="btn-ghost bg-white text-ink">
          <Download size={16} />
          Export CSV
        </a>
      </div>

      <div className="flex gap-2">
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
        <DataTable<OrderPaginated>
          columns={columns}
          data={orders}
          onRowClick={(row) => router.push(`/orders/${row.id}`)}
          pagination={{ total, limit, offset, onPageChange: setOffset }}
        />
      )}
    </div>
  );
}
