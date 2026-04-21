import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { OrderMapping, OrderStatus, Store } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DashboardOrders() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
  if (!store) {
    return (
      <main>
        <div className="sticky top-0 z-[2] flex flex-wrap items-end justify-between gap-4 border-b border-line bg-paper px-8 py-6">
          <div>
            <h1 className="m-0 font-display text-[24px] font-semibold tracking-[-.02em]">Orders</h1>
            <p className="mt-[3px] text-[13px] text-ink-3">Set up your store to start receiving orders.</p>
          </div>
        </div>
        <div className="px-8 py-7">
          <EmptyState
            title="No store yet"
            body="Create your store first so buyers can place orders."
            action={{ label: "Go to store settings", onClick: () => {} }}
          />
          <p className="mt-4 text-[13px] text-ink-3">
            <Link href="/dashboard/store" className="underline underline-offset-[3px]">
              Go to store settings
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const orders = await db
    .collection<OrderMapping>("orderMappings")
    .find({ storeId: store.storeId })
    .sort({ createdAt: -1 })
    .toArray();

  const awaitingDespatch = orders.filter((o) => o.status === "paid").length;

  const statusTone: Record<OrderStatus, "placed" | "paid" | "despatched" | "received" | "invoiced" | "cancelled"> = {
    placed: "placed",
    paid: "paid",
    despatched: "despatched",
    received: "received",
    invoiced: "invoiced",
    cancelled: "cancelled",
  };

  const statusLabel: Record<OrderStatus, string> = {
    placed: "Placed",
    paid: "Paid",
    despatched: "Despatched",
    received: "Received",
    invoiced: "Invoiced",
    cancelled: "Cancelled",
  };

  function formatPlaced(d: Date): string {
    return d.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main>
      <div className="sticky top-0 z-[2] flex flex-wrap items-end justify-between gap-4 border-b border-line bg-paper px-8 py-6">
        <div>
          <h1 className="m-0 font-display text-[24px] font-semibold tracking-[-.02em]">Orders</h1>
          <p className="mt-[3px] text-[13px] text-ink-3">
            All orders placed at {store.storeName}.{" "}
            <strong className="font-display font-semibold text-warn">
              {awaitingDespatch} awaiting despatch.
            </strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-[18px] px-8 py-7">
        {/* Filter bar (visual only for now — preserves access control + simple filter UI) */}
        <div className="flex flex-wrap items-center gap-[10px]">
          <label className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-line bg-paper px-3 text-[13px] text-ink-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <select className="border-0 bg-transparent font-[inherit] text-ink outline-none" defaultValue="all">
              <option value="all">All statuses</option>
              <option value="placed">Placed</option>
              <option value="paid">Paid</option>
              <option value="despatched">Despatched</option>
              <option value="received">Received</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-line bg-paper px-3 text-[13px] text-ink-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            <select className="border-0 bg-transparent font-[inherit] text-ink outline-none" defaultValue="30">
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
          </label>
          <div className="flex h-9 max-w-[280px] flex-1 items-center gap-2 rounded-[8px] border border-line bg-paper px-3 text-ink-4">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder="Search order # or buyer…"
              className="flex-1 border-0 bg-transparent font-[inherit] text-ink outline-none placeholder:text-ink-4"
            />
          </div>
          <span className="ml-auto font-mono text-[12px] text-ink-3">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </span>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            body="Once buyers start placing orders at your store, they'll appear here with status, total and downloadable documents."
          />
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-line bg-paper">
            <div className="grid grid-cols-[1.1fr_1.5fr_1fr_1.2fr_.9fr_30px] items-center gap-4 border-b border-line-2 bg-paper-2 px-[18px] py-3.5 text-[10.5px] font-medium uppercase tracking-[.12em] text-ink-3">
              <div>Order</div>
              <div>Buyer</div>
              <div>Placed</div>
              <div>Status</div>
              <div className="text-right">Total</div>
              <div />
            </div>
            {orders.map((o, idx) => {
              const cancelled = o.status === "cancelled";
              return (
                <Link
                  key={o.orderId}
                  href={`/dashboard/orders/${o.orderId}`}
                  className={`grid grid-cols-[1.1fr_1.5fr_1fr_1.2fr_.9fr_30px] items-center gap-4 px-[18px] py-3.5 transition-colors hover:bg-paper-2 ${
                    idx === 0 ? "" : "border-t border-line-2"
                  }`}
                >
                  <div className="font-mono text-[13px] font-medium">{o.orderId}</div>
                  <div>
                    <div className="text-[13px] font-medium text-ink">{o.buyerName}</div>
                    <div className="mt-[2px] font-mono text-[11.5px] text-ink-3">{o.buyerEmail}</div>
                  </div>
                  <div className="text-[13px] text-ink-2">{formatPlaced(new Date(o.createdAt))}</div>
                  <div>
                    <Chip tone={statusTone[o.status]} withDot>
                      {statusLabel[o.status]}
                    </Chip>
                  </div>
                  <div
                    className={`text-right font-mono text-[13.5px] font-medium ${
                      cancelled ? "text-ink-4 line-through" : ""
                    }`}
                  >
                    ${o.payableAmount.toFixed(2)}
                  </div>
                  <div className="text-right text-ink-4">→</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
