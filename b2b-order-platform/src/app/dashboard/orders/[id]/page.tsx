import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { chalksniffer } from "@/lib/chalksniffer-client";
import type { OrderMapping, OrderStatus, Order as UblOrder, Store } from "@/lib/types";
import { Chip } from "@/components/ui/chip";
import { DashboardShell } from "@/components/ledgr/dashboard-shell";
import { OrderActions } from "./order-actions";

export const dynamic = "force-dynamic";

function monogramFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatPlaced(d: Date): string {
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusLabel: Record<OrderStatus, string> = {
  placed: "Placed",
  paid: "Paid — ready to despatch",
  despatched: "Despatched",
  received: "Received",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

const chipTone = {
  placed: "placed",
  paid: "paid",
  despatched: "despatched",
  received: "received",
  invoiced: "invoiced",
  cancelled: "cancelled",
} as const;

export default async function SellerOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();

  const mapping = await db.collection<OrderMapping>("orderMappings").findOne({ orderId: params.id });
  if (!mapping) notFound();

  // Access control: this seller must own the store associated with this order.
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
  if (!store || store.storeId !== mapping.storeId) notFound();

  // Sidebar badge — orders paid but not yet despatched.
  const awaitingDespatch = await db
    .collection<OrderMapping>("orderMappings")
    .countDocuments({ storeId: store.storeId, status: "paid" });

  // Prefer the snapshot captured on the mapping at checkout time; fall back to
  // chalksniffer UBL for legacy rows without lines.
  let items: {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    unitCode: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];

  if (mapping.lines && mapping.lines.length > 0) {
    items = mapping.lines.map((l, i) => ({
      id: `${l.productId}-${l.variantId}-${i}`,
      name: l.name,
      description: l.variantLabel || null,
      sku: null,
      unitCode: "",
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    }));
  } else {
    let ublOrder: UblOrder | null = null;
    try {
      const res = await chalksniffer.getOrder(params.id);
      if (res && typeof res === "object" && "orderLines" in res) {
        ublOrder = res as unknown as UblOrder;
      }
    } catch {
      ublOrder = null;
    }
    items =
      ublOrder?.orderLines?.map((l, i) => {
        const li = l.lineItem;
        const qty = li.quantity ?? 0;
        const unit = li.price?.priceAmount ?? 0;
        return {
          id: li.id ?? String(i),
          name: li.item?.name ?? "Item",
          description: li.item?.description ?? null,
          sku: li.item?.sellersItemIdentification ?? null,
          unitCode: li.unitCode ?? "EA",
          qty,
          unitPrice: unit,
          lineTotal: li.lineExtensionAmount ?? unit * qty,
        };
      }) ?? [];
  }

  const totalPacked = items.reduce((s, it) => s + it.qty, 0);

  // Totals
  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0) || mapping.payableAmount;
  const platformFee = Math.round((mapping.payableAmount * 0.029 + 0.3) * 100) / 100;
  const payout = Math.round((mapping.payableAmount - platformFee) * 100) / 100;

  // Status events
  const historyByStatus: Partial<Record<OrderStatus, Date>> = {};
  for (const ev of mapping.statusHistory ?? []) {
    historyByStatus[ev.status] = new Date(ev.at);
  }
  const placedAt = historyByStatus.placed ?? new Date(mapping.createdAt);
  const paidAt = historyByStatus.paid ?? null;
  const despatchedAt = historyByStatus.despatched ?? null;
  const receivedAt = historyByStatus.received ?? null;
  const invoicedAt = historyByStatus.invoiced ?? null;

  const tone = chipTone[mapping.status];

  // Sub header dates
  let subDates = `Placed ${formatPlaced(placedAt)}`;
  if (mapping.status === "despatched" && despatchedAt) {
    subDates = `Placed ${formatPlaced(placedAt)} · Despatched ${formatPlaced(despatchedAt)}`;
  } else if (mapping.status === "received" && receivedAt) {
    subDates = `Placed ${formatPlaced(placedAt)} · Received ${formatPlaced(receivedAt)}`;
  } else if (mapping.status === "invoiced" && invoicedAt) {
    subDates = `Placed ${formatPlaced(placedAt)} · Invoiced ${formatPlaced(invoicedAt)}`;
  } else if (mapping.status === "cancelled") {
    const cancelledAt = historyByStatus.cancelled;
    subDates = cancelledAt
      ? `Placed ${formatPlaced(placedAt)} · Cancelled ${formatPlaced(cancelledAt)}`
      : `Placed ${formatPlaced(placedAt)}`;
  }

  const taxInvoiceReady = mapping.status === "received" || mapping.status === "invoiced";

  return (
    <DashboardShell
      store={{
        monogram: monogramFrom(store.storeName),
        name: store.storeName,
        status: store.status,
        slug: store.slug,
      }}
      user={{ name: session.name, initials: monogramFrom(session.name) }}
      active="orders"
      ordersBadge={awaitingDespatch}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 bg-paper px-8 py-[14px] text-[12.5px] text-ink-3">
        <Link href="/dashboard/orders" className="hover:text-ink">
          Orders
        </Link>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
        <span className="text-ink">{mapping.orderId}</span>
      </div>

      <div className="mx-auto max-w-[1080px] px-8 py-7">
        {/* Header card */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-paper px-7 py-6">
          <div className="min-w-0">
            <div className="mb-[6px] text-[11.5px] uppercase tracking-[.1em] text-ink-3">Order</div>
            <div className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-.02em]">
              {mapping.orderId}
            </div>
            <div className="mt-[6px] flex flex-wrap items-center gap-[10px] text-[13px] text-ink-3">
              <span>{subDates}</span>
              <span className="text-ink-4">·</span>
              <Chip tone={tone} withDot>
                {statusLabel[mapping.status]}
              </Chip>
            </div>
          </div>
          <div className="flex flex-col items-end gap-[10px]">
            <div className="font-mono text-[22px] font-medium tracking-[-.01em]">
              ${mapping.payableAmount.toFixed(2)}
            </div>
            <OrderActions
              orderId={mapping.orderId}
              status={mapping.status}
              buyerName={mapping.buyerName}
              total={mapping.payableAmount}
              invoiceId={mapping.invoiceId ?? null}
            />
          </div>
        </div>

        {/* Despatched info strip */}
        {mapping.status === "despatched" && (
          <div className="mb-5 flex items-center gap-[10px] rounded-[10px] bg-[var(--s-despatched-bg)] px-4 py-3.5 text-[13px] text-[color:var(--s-despatched-fg)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>
              <strong className="font-display font-semibold">Awaiting buyer confirmation.</strong>{" "}
              The invoice will be generated automatically once {mapping.buyerName.split(" ")[0] || "the buyer"}{" "}
              marks the order as received.
            </span>
          </div>
        )}

        {/* Two-col content */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.5fr_1fr] md:items-start">
          {/* Left */}
          <div className="flex flex-col gap-5">
            {/* Items */}
            <div className="overflow-hidden rounded-[12px] border border-line bg-paper">
              <div className="flex items-center justify-between border-b border-line-2 bg-paper-2 px-5 py-4">
                <span className="font-display text-[14px] font-semibold tracking-[-.01em]">Items</span>
                <span className="text-[12px] text-ink-3">{totalPacked} to pack</span>
              </div>
              <div className="px-5 py-1">
                {items.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-ink-3">
                    Order line items unavailable.
                  </div>
                ) : (
                  items.map((it, i) => (
                    <div
                      key={it.id ?? i}
                      className={`grid grid-cols-[1fr_auto] items-center gap-4 py-3.5 ${
                        i === 0 ? "" : "border-t border-line-2"
                      }`}
                    >
                      <div>
                        <div className="text-[13.5px] font-medium tracking-[-.005em]">{it.name}</div>
                        <div className="mt-[3px] text-[11.5px] text-ink-3">
                          {it.description ? `${it.description} · ` : ""}
                          {it.sku ? `SKU ${it.sku}` : it.unitCode}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[13px] font-medium">
                          ${it.lineTotal.toFixed(2)}
                        </div>
                        <div className="mt-[2px] font-mono text-[11.5px] text-ink-3">
                          {it.qty} × ${it.unitPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Buyer & delivery */}
            <div className="overflow-hidden rounded-[12px] border border-line bg-paper">
              <div className="border-b border-line-2 bg-paper-2 px-5 py-4">
                <span className="font-display text-[14px] font-semibold tracking-[-.01em]">
                  Buyer &amp; delivery
                </span>
              </div>
              <div className="px-5 py-4 text-[13px] leading-[1.6] text-ink-2">
                <div>
                  <strong className="font-display font-semibold text-ink">{mapping.buyerName}</strong>
                  {" · "}
                  <span className="font-mono">{mapping.buyerEmail}</span>
                </div>
                {mapping.buyerPhone && <div>{mapping.buyerPhone}</div>}
                <div className="mt-3">
                  {mapping.buyerAddress.streetName}
                  <br />
                  {mapping.buyerAddress.cityName} {mapping.buyerAddress.postalZone}
                  <br />
                  {mapping.buyerAddress.country}
                </div>
                {mapping.note && (
                  <div className="mt-3 border-t border-line-2 pt-3 italic text-ink-3">
                    &ldquo;{mapping.note}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-5">
            {/* Totals */}
            <div className="rounded-[12px] border border-line bg-paper px-5 py-4">
              <TotalsRow k="Subtotal" v={`$${subtotal.toFixed(2)}`} />
              <TotalsRow k="Shipping" v="Free" />
              <TotalsRow k="Platform fee (2.9% + 30¢)" v={`−$${platformFee.toFixed(2)}`} dim />
              <div className="mt-[10px] flex items-baseline justify-between border-t border-line-2 pt-3 font-display text-[15px] font-semibold text-ink">
                <span>Payout</span>
                <span className="font-mono text-[16px] font-semibold">${payout.toFixed(2)}</span>
              </div>
            </div>

            {/* Documents */}
            <div className="overflow-hidden rounded-[12px] border border-line bg-paper">
              <div className="border-b border-line-2 bg-paper-2 px-5 py-4">
                <span className="font-display text-[14px] font-semibold tracking-[-.01em]">Documents</span>
              </div>
              <div className="px-5 py-1">
                <a
                  href={`/api/orders/${mapping.orderId}/packing-slip`}
                  className="flex items-center justify-between py-3 text-[13px] text-ink hover:text-hot"
                >
                  <div>
                    <div>Packing slip (PDF)</div>
                    <div className="mt-[2px] text-[11.5px] text-ink-3">
                      Print to include in the parcel.
                    </div>
                  </div>
                  <span className="text-ink-4">↓</span>
                </a>
                {taxInvoiceReady && mapping.invoiceId ? (
                  <a
                    href={`/api/invoices/${mapping.invoiceId}/pdf`}
                    className="flex items-center justify-between border-t border-line-2 py-3 text-[13px] text-ink hover:text-hot"
                  >
                    <div>
                      <div>Tax invoice (PDF)</div>
                      <div className="mt-[2px] text-[11.5px] text-ink-3">
                        Issued once the buyer confirmed receipt.
                      </div>
                    </div>
                    <span className="text-ink-4">↓</span>
                  </a>
                ) : (
                  <div className="flex cursor-not-allowed items-center justify-between border-t border-line-2 py-3 text-[13px] text-ink-4">
                    <div>
                      <div>Tax invoice (PDF)</div>
                      <div className="mt-[2px] text-[11.5px] text-ink-4">
                        Generated once the buyer confirms receipt.
                      </div>
                    </div>
                    <span>○</span>
                  </div>
                )}
                <a
                  href={`/api/orders/${mapping.orderId}/xml`}
                  className="flex items-center justify-between border-t border-line-2 py-3 text-[13px] text-ink hover:text-hot"
                >
                  <div>
                    <div>Order UBL XML</div>
                    <div className="mt-[2px] text-[11.5px] text-ink-3">
                      Raw Peppol-compatible order document.
                    </div>
                  </div>
                  <span className="text-ink-4">↓</span>
                </a>
              </div>
            </div>

            {/* Timeline */}
            <div className="overflow-hidden rounded-[12px] border border-line bg-paper">
              <div className="border-b border-line-2 bg-paper-2 px-5 py-4">
                <span className="font-display text-[14px] font-semibold tracking-[-.01em]">Timeline</span>
              </div>
              <div className="px-5 py-3 text-[12px]">
                <TimelineRow label="Placed" at={formatDate(placedAt)} done />
                <TimelineRow
                  label="Paid"
                  at={paidAt ? formatDate(paidAt) : "Pending"}
                  done={Boolean(paidAt)}
                />
                <TimelineRow
                  label="Despatched"
                  at={despatchedAt ? formatDate(despatchedAt) : "Pending"}
                  done={Boolean(despatchedAt)}
                />
                <TimelineRow
                  label="Received"
                  at={receivedAt ? formatDate(receivedAt) : "—"}
                  done={Boolean(receivedAt)}
                />
                <TimelineRow
                  label="Invoiced"
                  at={invoicedAt ? formatDate(invoicedAt) : "—"}
                  done={Boolean(invoicedAt)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function TotalsRow({ k, v, dim }: { k: string; v: string; dim?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-[6px] text-[13px]">
      <span className="text-ink-3">{k}</span>
      <span className={`font-mono font-medium ${dim ? "text-ink-3" : ""}`}>{v}</span>
    </div>
  );
}

function TimelineRow({ label, at, done }: { label: string; at: string; done: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${done ? "" : "text-ink-4"}`}>
      <span>{label}</span>
      <span className={`font-mono ${done ? "text-ink" : ""}`}>{at}</span>
    </div>
  );
}
