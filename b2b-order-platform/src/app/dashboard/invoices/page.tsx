import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { OrderMapping, Store } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardShell } from "@/components/ledgr/dashboard-shell";

function monogramFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type InvoiceStatus = "draft" | "sent" | "paid";

type InvoiceRow = {
  invoiceId: string;
  orderRef: string;
  buyerName: string;
  buyerEmail: string;
  issuedAt: Date;
  status: InvoiceStatus;
  total: number;
  currency: string;
};

function formatIssued(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function SellerInvoicesPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
  if (!store) {
    const placeholderStore = { monogram: "--", name: "No store yet", status: "closed" as const };
    return (
      <DashboardShell
        store={placeholderStore}
        user={{ name: session.name, initials: monogramFrom(session.name) }}
        active="invoices"
      >
        <div className="sticky top-0 z-[2] flex flex-wrap items-end justify-between gap-4 border-b border-line bg-paper px-8 py-6">
          <div>
            <h1 className="m-0 font-display text-[24px] font-semibold tracking-[-.02em]">Invoices</h1>
            <p className="mt-[3px] text-[13px] text-ink-3">
              Set up your store to start issuing invoices.
            </p>
          </div>
        </div>
        <div className="px-8 py-7">
          <p className="text-[13px] text-ink-3">
            You need a store first.{" "}
            <Link href="/dashboard/store" className="underline underline-offset-[3px]">
              Create one
            </Link>
            .
          </p>
        </div>
      </DashboardShell>
    );
  }

  // Prefer a dedicated `invoices` collection when present; fall back to orderMappings with invoiceId.
  const invoiceDocs = await db
    .collection<{
      invoice_id?: string;
      invoiceId?: string;
      order_reference?: string;
      orderRef?: string;
      customer?: { name?: string | null };
      customer_name?: string;
      status?: InvoiceStatus;
      issue_date?: string;
      created_at?: string;
      createdAt?: Date | string;
      payable_amount?: number;
      total?: number;
      currency?: string;
      storeId?: string;
    }>("invoices")
    .find({ storeId: store.storeId })
    .sort({ created_at: -1 })
    .toArray()
    .catch(() => []);

  let rows: InvoiceRow[] = [];

  if (invoiceDocs.length > 0) {
    // Need buyer emails from mapping if not present
    const orderRefs = invoiceDocs.map((d) => d.order_reference ?? d.orderRef ?? "").filter(Boolean);
    const mappings = await db
      .collection<OrderMapping>("orderMappings")
      .find({ orderId: { $in: orderRefs } })
      .toArray();
    const byOrder = new Map(mappings.map((m) => [m.orderId, m] as const));
    rows = invoiceDocs
      .map((d): InvoiceRow | null => {
        const invoiceId = d.invoice_id ?? d.invoiceId ?? "";
        if (!invoiceId) return null;
        const orderRef = d.order_reference ?? d.orderRef ?? "";
        const m = byOrder.get(orderRef);
        const issuedRaw = d.issue_date ?? d.created_at ?? d.createdAt ?? new Date();
        return {
          invoiceId,
          orderRef,
          buyerName: m?.buyerName ?? d.customer?.name ?? d.customer_name ?? "Unknown buyer",
          buyerEmail: m?.buyerEmail ?? "",
          issuedAt: new Date(issuedRaw as string | Date),
          status: (d.status as InvoiceStatus) ?? "sent",
          total: d.payable_amount ?? d.total ?? m?.payableAmount ?? 0,
          currency: d.currency ?? m?.documentCurrencyCode ?? "AUD",
        };
      })
      .filter((r): r is InvoiceRow => r !== null);
  } else {
    const mappings = await db
      .collection<OrderMapping>("orderMappings")
      .find({ storeId: store.storeId, invoiceId: { $exists: true } })
      .sort({ createdAt: -1 })
      .toArray();
    rows = mappings
      .filter((m) => Boolean(m.invoiceId))
      .map((m) => {
        const invoicedAt =
          m.statusHistory?.find((e) => e.status === "invoiced")?.at ?? m.updatedAt ?? m.createdAt;
        return {
          invoiceId: m.invoiceId as string,
          orderRef: m.orderId,
          buyerName: m.buyerName,
          buyerEmail: m.buyerEmail,
          issuedAt: new Date(invoicedAt),
          status: (m.status === "invoiced" ? "sent" : "draft") as InvoiceStatus,
          total: m.payableAmount,
          currency: m.documentCurrencyCode,
        } satisfies InvoiceRow;
      });
  }

  const statusTone: Record<InvoiceStatus, "draft" | "sent" | "paid"> = {
    draft: "draft",
    sent: "sent",
    paid: "paid",
  };
  const statusLabel: Record<InvoiceStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
  };

  return (
    <DashboardShell
      store={{
        monogram: monogramFrom(store.storeName),
        name: store.storeName,
        status: store.status,
        slug: store.slug,
      }}
      user={{ name: session.name, initials: monogramFrom(session.name) }}
      active="invoices"
    >
      <div className="sticky top-0 z-[2] flex flex-wrap items-end justify-between gap-4 border-b border-line bg-paper px-8 py-6">
        <div>
          <h1 className="m-0 font-display text-[24px] font-semibold tracking-[-.02em]">Invoices</h1>
          <p className="mt-[3px] text-[13px] text-ink-3">
            Generated from received orders — sent to buyers, downloadable as PDF or UBL.
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
        <div className="flex flex-wrap items-center gap-[10px]">
          <label className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-line bg-paper px-3 text-[13px] text-ink-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <select className="border-0 bg-transparent font-[inherit] text-ink outline-none" defaultValue="all">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          <label className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-line bg-paper px-3 text-[13px] text-ink-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            <select className="border-0 bg-transparent font-[inherit] text-ink outline-none" defaultValue="90">
              <option value="90">Last 90 days</option>
              <option value="30">Last 30 days</option>
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
              placeholder="Search invoice # or order ref…"
              className="flex-1 border-0 bg-transparent font-[inherit] text-ink outline-none placeholder:text-ink-4"
            />
          </div>
          <span className="ml-auto font-mono text-[12px] text-ink-3">
            {rows.length} invoice{rows.length === 1 ? "" : "s"}
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            body="Invoices are generated automatically when buyers confirm receipt of an order. They appear here with PDF and UBL XML downloads."
          />
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-line bg-paper">
            <div className="grid grid-cols-[1fr_1.1fr_1.4fr_1fr_1fr_.9fr_30px] items-center gap-4 border-b border-line-2 bg-paper-2 px-[18px] py-3.5 text-[10.5px] font-medium uppercase tracking-[.12em] text-ink-3">
              <div>Invoice</div>
              <div>Order ref</div>
              <div>Buyer</div>
              <div>Issued</div>
              <div>Status</div>
              <div className="text-right">Total</div>
              <div />
            </div>
            {rows.map((r, idx) => (
              <Link
                key={r.invoiceId}
                href={`/dashboard/invoices/${r.invoiceId}`}
                className={`grid grid-cols-[1fr_1.1fr_1.4fr_1fr_1fr_.9fr_30px] items-center gap-4 px-[18px] py-3.5 transition-colors hover:bg-paper-2 ${
                  idx === 0 ? "" : "border-t border-line-2"
                }`}
              >
                <div className="font-mono text-[13px] font-medium">{r.invoiceId}</div>
                <div className="font-mono text-[12.5px] text-ink-2">{r.orderRef}</div>
                <div>
                  <div className="text-[13px] font-medium text-ink">{r.buyerName}</div>
                  {r.buyerEmail && (
                    <div className="mt-[2px] font-mono text-[11.5px] text-ink-3">{r.buyerEmail}</div>
                  )}
                </div>
                <div className="text-[13px] text-ink-2">{formatIssued(r.issuedAt)}</div>
                <div>
                  <Chip tone={statusTone[r.status]} withDot>
                    {statusLabel[r.status]}
                  </Chip>
                </div>
                <div className="text-right font-mono text-[13.5px] font-medium">
                  ${r.total.toFixed(2)}
                </div>
                <div className="text-right text-ink-4">→</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
