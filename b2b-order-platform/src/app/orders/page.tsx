"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderPaginated, OrderMapping } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type OrderWithMapping = OrderPaginated & { mapping?: OrderMapping };

const STATUS_OPTIONS = [
  "Action Required",
  "Awaiting Review",
  "Despatched",
  "Received",
  "Awaiting Payment",
  "Paid",
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

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(amount: string | number, currency: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${amount} ${currency}`;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    minimumFractionDigits: 2,
  }).format(num);
}

type SortKey = "counterparty" | "date" | "amount" | "status";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={12} className="text-ink-faint" />;
  return dir === "asc"
    ? <ArrowUp size={12} className="text-accent-buyer" />
    : <ArrowDown size={12} className="text-accent-buyer" />;
}

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allOrders, setAllOrders] = useState<OrderWithMapping[]>([]);
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
    const s = searchParams.get("status");
    return s ? new Set(s.split(",")) : new Set<string>();
  });
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [amountMin, setAmountMin] = useState(searchParams.get("amountMin") || "");
  const [amountMax, setAmountMax] = useState(searchParams.get("amountMax") || "");

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(0);
  const perPage = 20;

  useEffect(() => {
    async function load() {
      const [ordersRes, sessionRes] = await Promise.all([
        fetch("/api/orders?limit=500&offset=0"),
        fetch("/api/auth/session"),
      ]);

      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRole(session.role);
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const orderList: OrderPaginated[] = data.orders || [];

        const mappingPromises = orderList.map((o) =>
          fetch(`/api/links?orderId=${o.id}`).then((r) => (r.ok ? r.json() : null))
        );
        const mappings = await Promise.all(mappingPromises);
        setAllOrders(
          orderList.map((o, i) => ({ ...o, mapping: mappings[i] || undefined }))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedStatuses.size > 0) params.set("status", Array.from(selectedStatuses).join(","));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (amountMin) params.set("amountMin", amountMin);
    if (amountMax) params.set("amountMax", amountMax);
    const qs = params.toString();
    router.replace(`/orders${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [search, selectedStatuses, dateFrom, dateTo, amountMin, amountMax, router]);

  function handleApply() {
    setPage(0);
    updateUrl();
  }

  function handleClear() {
    setSearch("");
    setSelectedStatuses(new Set());
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setPage(0);
    router.replace("/orders", { scroll: false });
  }

  function toggleStatus(s: string) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let result = allOrders.map((o) => ({
      ...o,
      statusLabel: getStatusLabel(o.mapping, role),
      counterparty: role === "buyer" ? o.sellerName : o.buyerName,
      amount: Number(o.payableAmount) || 0,
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.counterparty.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          (o.mapping?.sellerNote || "").toLowerCase().includes(q)
      );
    }

    if (selectedStatuses.size > 0) {
      result = result.filter((o) => selectedStatuses.has(o.statusLabel));
    }

    if (dateFrom) result = result.filter((o) => o.issueDate >= dateFrom);
    if (dateTo) result = result.filter((o) => o.issueDate <= dateTo);

    if (amountMin) result = result.filter((o) => o.amount >= Number(amountMin));
    if (amountMax) result = result.filter((o) => o.amount <= Number(amountMax));

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "counterparty": cmp = a.counterparty.localeCompare(b.counterparty); break;
        case "date": cmp = a.issueDate.localeCompare(b.issueDate); break;
        case "amount": cmp = a.amount - b.amount; break;
        case "status": cmp = a.statusLabel.localeCompare(b.statusLabel); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [allOrders, role, search, selectedStatuses, dateFrom, dateTo, amountMin, amountMax, sortKey, sortDir]);

  const totalFiltered = filtered.length;
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(totalFiltered / perPage);

  if (loading) return <LoadingSpinner message="Loading orders..." />;

  const isBuyer = role === "buyer";

  if (allOrders.length === 0) {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Showing {totalFiltered} order{totalFiltered !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/api/orders/csv"
          className="btn-ghost bg-white text-ink flex items-center gap-2 text-sm"
        >
          <Download size={15} />
          Export CSV
        </a>
      </div>

      {/* Sidebar + Table */}
      <div className="card overflow-hidden flex">
        {/* Sidebar Filters */}
        <aside className="w-56 shrink-0 space-y-5 border-r border-surface-border p-4">
          <h2 className="text-sm font-bold text-ink">Filters</h2>

          <div>
            <label className="input-label">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              placeholder="Search orders..."
              className="input mt-1"
            />
          </div>

          <div>
            <label className="input-label">Status</label>
            <div className="mt-1.5 space-y-1.5">
              {STATUS_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.has(s)}
                    onChange={() => toggleStatus(s)}
                    className="rounded border-surface-border"
                  />
                  <span className="text-sm text-ink">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">Date Range</label>
            <div className="mt-1 space-y-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="input-label">Amount Range</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="Min" className="input flex-1" />
              <span className="text-xs text-ink-faint">—</span>
              <input type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="Max" className="input flex-1" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleApply} className="btn-primary flex-1 text-sm">Apply</button>
            <button onClick={handleClear} className="btn-ghost flex-1 text-sm">Clear</button>
          </div>
        </aside>

        {/* Main Table */}
        <div className="flex-1">
        {paginated.length === 0 ? (
          <EmptyState title="No orders match your filters" description="Try adjusting your search or filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-surface-border bg-surface-overlay">
                  <th
                    className="group px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted cursor-pointer select-none hover:text-ink"
                    onClick={() => handleSort("counterparty")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Counterparty
                      <SortIcon active={sortKey === "counterparty"} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="group px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted cursor-pointer select-none hover:text-ink"
                    onClick={() => handleSort("date")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Date
                      <SortIcon active={sortKey === "date"} dir={sortDir} />
                    </span>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Order ID
                  </th>
                  <th
                    className="group px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted cursor-pointer select-none hover:text-ink"
                    onClick={() => handleSort("amount")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Amount
                      <SortIcon active={sortKey === "amount"} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="group px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted cursor-pointer select-none hover:text-ink"
                    onClick={() => handleSort("status")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Status
                      <SortIcon active={sortKey === "status"} dir={sortDir} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((order) => {
                  const isActionRequired = order.statusLabel === "Action Required";
                  return (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className={`
                        group border-b border-surface-border last:border-0 cursor-pointer
                                               ${isActionRequired
                          ? "bg-amber-50/20 hover:bg-amber-50/30"
                          : "hover:bg-surface-hover"
                        }
                      `}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Avatar circle with first letter */}
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-ink-muted">
                            {order.counterparty.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-ink">
                            {order.counterparty}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-muted whitespace-nowrap">
                        {formatDate(order.issueDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded bg-surface px-2 py-1 text-xs font-mono text-ink-faint">
                          {order.id.slice(0, 12)}...
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-semibold tabular-nums text-ink">
                          {formatCurrency(order.payableAmount, order.documentCurrencyCode)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge label={order.statusLabel} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-5 py-3 bg-surface-overlay/50">
            <p className="text-xs text-ink-muted">
              Showing{" "}
              <span className="font-semibold text-ink">{page * perPage + 1}</span>
              {" "}–{" "}
              <span className="font-semibold text-ink">{Math.min((page + 1) * perPage, totalFiltered)}</span>
              {" "}of{" "}
              <span className="font-semibold text-ink">{totalFiltered}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-muted
                  hover:bg-surface-hover hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const startPage = Math.max(0, Math.min(page - 2, totalPages - 5));
                const pageNum = startPage + i;
                if (pageNum >= totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`
                      inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium                      ${pageNum === page
                        ? "bg-accent-buyer text-white"
                        : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                      }
                    `}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page + 1 >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-muted
                  hover:bg-surface-hover hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading orders..." />}>
      <OrdersPageInner />
    </Suspense>
  );
}
