import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, Download, Search, Package } from "lucide-react";
import clientPromise from "@/lib/db";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import type { OrderMapping, OrderStatus, Store } from "@/lib/types";
import { StoreTopNav } from "@/components/ledgr/store-top-nav";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

function monogramFor(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const STATUS_CHIP_TONE: Record<
  OrderStatus,
  "placed" | "paid" | "despatched" | "received" | "invoiced" | "cancelled"
> = {
  placed: "placed",
  paid: "paid",
  despatched: "despatched",
  received: "received",
  invoiced: "invoiced",
  cancelled: "cancelled",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  paid: "Paid",
  despatched: "Despatched",
  received: "Received",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthYear(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export default async function StoreBuyerOrders({
  params,
}: {
  params: { slug: string };
}) {
  const buyer = await getBuyerSessionOrNull();
  if (!buyer) redirect(`/login?next=/store/${params.slug}/orders`);

  const db = (await clientPromise).db();
  let store = await getStoreBySlug(db, params.slug);
  if (!store) {
    const byId = await db
      .collection<Store>("stores")
      .findOne({ storeId: params.slug });
    if (!byId) return notFound();
    store = await backfillSlugIfMissing(db, byId);
    if (store.slug !== params.slug) return notFound();
  }

  const mappings = await db
    .collection<OrderMapping>("orderMappings")
    .find({
      storeId: store.storeId,
      $or: [{ buyerId: buyer.userId }, { buyerEmail: buyer.email }],
    })
    .sort({ createdAt: -1 })
    .toArray();

  const storeNav = {
    slug: store.slug ?? store.storeId,
    name: store.storeName,
    monogram: monogramFor(store.storeName),
  };

  const total = mappings.length;
  const earliest =
    mappings.length > 0 ? mappings[mappings.length - 1].createdAt : null;

  return (
    <>
      <StoreTopNav
        shop={storeNav}
        active="orders"
        user={{ name: buyer.name }}
      />
      <div className="mx-auto max-w-[1360px] px-6 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="font-display text-[28px] font-semibold tracking-[-.022em] m-0">
              Your orders at {store.storeName}
            </h1>
            <p className="mt-1 text-[13px] text-ink-3">
              {total === 0
                ? `No orders placed with ${store.storeName} yet.`
                : `${total} ${total === 1 ? "order" : "orders"} placed${
                    earliest ? ` since ${formatMonthYear(earliest)}` : ""
                  }.`}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex gap-2.5 items-center flex-wrap mb-[18px]">
          <Select defaultValue="all">
            <SelectTrigger className="h-9 w-auto min-w-[150px] text-[13px] px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="despatched">Despatched</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="invoiced">Invoiced</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="90">
            <SelectTrigger className="h-9 w-auto min-w-[150px] text-[13px] px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-[280px]">
            <Search
              aria-hidden
              className="absolute left-[11px] top-1/2 -translate-y-1/2 h-[13px] w-[13px] text-ink-3 pointer-events-none"
            />
            <Input
              placeholder="Search order # or item…"
              aria-label="Search orders"
              className="h-9 pl-8 text-[13px] rounded-[8px]"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[11.5px] text-ink-3">
              {total} of {total}
            </span>
            <Button variant="ghost" size="sm" className="gap-2">
              <Download className="h-[13px] w-[13px]" />
              Export CSV
            </Button>
          </div>
        </div>

        {total === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line bg-paper px-6 py-16 text-center">
            <div className="mx-auto mb-[18px] grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
              <Package className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="font-display text-[20px] font-semibold tracking-[-.015em] m-0 mb-2">
              No orders yet at {store.storeName}
            </h3>
            <p className="m-0 mb-5 text-[13px] leading-[1.55] text-ink-3 max-w-[440px] mx-auto">
              When you place your first order at {store.storeName}, it will show
              up here with its status and full delivery trail.
            </p>
            <Button asChild>
              <Link href={`/store/${store.slug ?? store.storeId}`}>
                Browse shop
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Table card */}
            <div className="border border-line rounded-[12px] overflow-hidden bg-paper">
              <div
                className="grid grid-cols-[1.2fr_1fr_1.4fr_1.2fr_.9fr_40px] gap-[18px] px-[18px] py-[14px] bg-paper-2 border-b border-line-2 text-[11px] uppercase tracking-[.12em] text-ink-3 font-medium"
                role="row"
              >
                <div>Order</div>
                <div>Placed</div>
                <div>Items</div>
                <div>Status</div>
                <div className="text-right">Total</div>
                <div aria-hidden />
              </div>

              {mappings.map((m, idx) => {
                const chipTone = STATUS_CHIP_TONE[m.status];
                const isCancelled = m.status === "cancelled";
                const totalText = `$${m.payableAmount.toFixed(2)}`;
                const itemsLabel = "—";
                return (
                  <Link
                    key={m.orderId}
                    href={`/store/${store!.slug ?? store!.storeId}/orders/${m.orderId}`}
                    className={`grid grid-cols-[1.2fr_1fr_1.4fr_1.2fr_.9fr_40px] gap-[18px] px-[18px] py-[14px] items-center transition-colors hover:bg-paper-2 ${
                      idx === 0 ? "" : "border-t border-line-2"
                    }`}
                  >
                    <div className="font-mono text-[13px] font-medium truncate">
                      {m.orderId}
                    </div>
                    <div className="text-[13px] text-ink-2">
                      {formatDate(m.createdAt)}
                    </div>
                    <div className="text-[13px] text-ink-2">{itemsLabel}</div>
                    <div>
                      <Chip tone={chipTone} withDot>
                        {STATUS_LABEL[m.status]}
                      </Chip>
                    </div>
                    <div
                      className={`font-mono text-[13.5px] font-medium text-right ${
                        isCancelled ? "line-through text-ink-4" : ""
                      }`}
                    >
                      {totalText}
                    </div>
                    <div
                      className="text-ink-4 text-right"
                      aria-hidden
                    >
                      <ArrowRight className="h-4 w-4 inline-block" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination footer (static — client-side pagination ships later) */}
            <div className="flex justify-between items-center mt-4 text-[12.5px] text-ink-3">
              <div>
                Showing 1&ndash;{total} of {total}
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" disabled>
                  ←
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="min-w-[30px] px-2.5"
                >
                  1
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  →
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
