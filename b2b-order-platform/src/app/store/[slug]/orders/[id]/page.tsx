import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertCircle,
  Check,
  FileDown,
  MessageSquare,
  Flag,
  FileText,
  RefreshCw,
  ArrowRight,
  Circle,
} from "lucide-react";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { getStoreBySlug, backfillSlugIfMissing } from "@/lib/store-service";
import { chalksniffer } from "@/lib/chalksniffer-client";
import type { OrderMapping, OrderStatus, Store, Order as UblOrder } from "@/lib/types";
import { StoreTopNav } from "@/components/ledgr/store-top-nav";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { ConfirmReceiptButton, CopyTrackingButton } from "./order-detail-actions";

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
  despatched: "Despatched · in transit",
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

export default async function StoreBuyerOrderDetail({
  params,
  searchParams,
}: {
  params: { slug: string; id: string };
  searchParams?: { t?: string };
}) {
  const db = (await clientPromise).db();

  // Look up the store first so we can always render the shell on error.
  let store = await getStoreBySlug(db, params.slug);
  if (!store) {
    const byId = await db
      .collection<Store>("stores")
      .findOne({ storeId: params.slug });
    if (!byId) return notFound();
    store = await backfillSlugIfMissing(db, byId);
    if (store.slug !== params.slug) return notFound();
  }

  const storeNav = {
    slug: store.slug ?? store.storeId,
    name: store.storeName,
    monogram: monogramFor(store.storeName),
  };

  const token = searchParams?.t ?? null;
  const auth = await authorizeOrderAccess(db, params.id, token);

  // Buyer session for the top-nav and gating the recurring CTA.
  const buyer = await getBuyerSessionOrNull();

  if ("error" in auth) {
    if (!buyer) {
      return (
        <>
          <StoreTopNav shop={storeNav} active="orders" user={null} />
          <div className="mx-auto max-w-[520px] px-6 py-16 text-center">
            <div className="mx-auto mb-[18px] grid h-14 w-14 place-items-center rounded-full bg-s-cancelled-bg text-s-cancelled-fg">
              <AlertCircle className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="font-display text-[22px] font-semibold tracking-[-.015em] m-0 mb-2">
              This order link has expired
            </h2>
            <p className="m-0 mb-5 text-[13.5px] leading-[1.55] text-ink-3">
              Guest order links are valid for 90 days. To keep viewing this
              order, sign in to the email address you used at checkout — or ask{" "}
              {store.storeName} to re-send the link.
            </p>
            <div className="flex gap-2.5 justify-center flex-wrap">
              <Button asChild>
                <Link
                  href={`/login?next=/store/${storeNav.slug}/orders/${params.id}`}
                >
                  Sign in to continue <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost">Email me a new link</Button>
            </div>
          </div>
        </>
      );
    }
    redirect(`/store/${storeNav.slug}/orders`);
  }

  const mapping: OrderMapping = auth.mapping;
  const chipTone = STATUS_CHIP_TONE[mapping.status];
  const isCancelled = mapping.status === "cancelled";
  const totalText = `$${mapping.payableAmount.toFixed(2)}`;
  const cancelledEvent = mapping.statusHistory.find(
    (e) => e.status === "cancelled"
  );

  const showTracking =
    !!mapping.despatchDocumentId &&
    (mapping.status === "despatched" || mapping.status === "received");
  const trackingUrl = mapping.despatchDocumentId
    ? `https://track.ledgr.local/${mapping.despatchDocumentId}`
    : null;

  const canMarkReceived = mapping.status === "despatched" && auth.role !== "guest";
  const canDownloadInvoice =
    mapping.status === "invoiced" && !!mapping.invoiceId;

  const showRecurringCta =
    !!buyer && !isCancelled && mapping.status !== "placed";

  // Prefer the snapshot captured on the mapping at checkout time. Fall back to
  // fetching the UBL order from chalksniffer for legacy mappings without lines.
  let lineItems: {
    id: string;
    name: string;
    description: string | null;
    unitCode: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];

  if (mapping.lines && mapping.lines.length > 0) {
    lineItems = mapping.lines.map((l, i) => ({
      id: `${l.productId}-${l.variantId}-${i}`,
      name: l.name,
      description: l.variantLabel || null,
      unitCode: "",
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    }));
  } else {
    let ublOrder: UblOrder | null = null;
    try {
      const res = await chalksniffer.getOrder(mapping.orderId);
      if (res && typeof res === "object" && "orderLines" in res) {
        ublOrder = res as unknown as UblOrder;
      }
    } catch {
      ublOrder = null;
    }
    lineItems =
      ublOrder?.orderLines?.map((l, i) => {
        const li = l.lineItem;
        const qty = li.quantity ?? 0;
        const unit = li.price?.priceAmount ?? 0;
        return {
          id: li.id ?? String(i),
          name: li.item?.name ?? "Item",
          description: li.item?.description ?? null,
          unitCode: li.unitCode ?? "",
          qty,
          unitPrice: unit,
          lineTotal: li.lineExtensionAmount ?? unit * qty,
        };
      }) ?? [];
  }

  const itemCount = lineItems.reduce((s, it) => s + it.qty, 0);
  const subtotal = lineItems.reduce((s, it) => s + it.lineTotal, 0) || mapping.payableAmount;
  const despatchedAt = mapping.statusHistory.find((e) => e.status === "despatched")?.at;

  return (
    <>
      <StoreTopNav
        shop={storeNav}
        active="orders"
        user={buyer ? { name: buyer.name } : null}
      />
      <div className="mx-auto max-w-[1080px] px-6 py-7">
        <Link
          href={`/store/${storeNav.slug}/orders`}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink mb-3"
        >
          ← Back to orders
        </Link>

        {/* OrderDetailHeader */}
        <div className="border border-line rounded-[14px] bg-paper px-7 py-6 mb-5 flex justify-between items-center gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11.5px] uppercase tracking-[.1em] text-ink-3 mb-1.5">
              Order
            </div>
            <div className="font-display text-[28px] font-semibold tracking-[-.02em] leading-none">
              {mapping.orderId}
            </div>
            <div className="mt-2 flex items-center gap-2.5 text-[13px] text-ink-3 flex-wrap">
              <span>Placed {formatDate(mapping.createdAt)}</span>
              <span className="text-ink-4" aria-hidden>·</span>
              <Chip tone={chipTone} withDot>
                {STATUS_LABEL[mapping.status]}
              </Chip>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <div
              className={`font-mono text-[22px] font-medium tracking-[-.01em] ${
                isCancelled ? "line-through text-ink-4" : ""
              }`}
            >
              {totalText}
            </div>
            {canMarkReceived && (
              <ConfirmReceiptButton orderId={mapping.orderId} />
            )}
            {canDownloadInvoice && (
              <Button variant="ghost" size="md" asChild>
                <a
                  href={`/api/invoices/${mapping.invoiceId}/pdf`}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Download invoice (PDF)
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* TrackingBanner */}
        {showTracking && trackingUrl && (
          <div className="border border-line rounded-[10px] bg-paper px-[18px] py-[14px] flex justify-between items-center gap-4 mb-5 flex-wrap">
            <div className="min-w-0">
              <div className="text-[11.5px] uppercase tracking-[.1em] text-ink-3">
                Tracking
              </div>
              <div className="font-mono text-[13px] text-ink break-all mt-0.5">
                {trackingUrl}
              </div>
            </div>
            <CopyTrackingButton value={trackingUrl} />
          </div>
        )}

        {/* Two-column content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
          {/* Left column */}
          <div className="grid gap-5">
            {/* Items card */}
            <div className="border border-line rounded-[12px] bg-paper overflow-hidden">
              <div className="px-5 py-4 border-b border-line-2 bg-paper-2 flex justify-between items-center">
                <span className="font-display font-semibold text-[14px] tracking-[-.01em]">
                  Items
                </span>
                <span className="text-[12px] text-ink-3">
                  {lineItems.length > 0 ? `${itemCount} · ` : ""}
                  {despatchedAt
                    ? `despatched ${formatDate(despatchedAt)}`
                    : `placed ${formatDate(mapping.createdAt)}`}
                </span>
              </div>
              <div className="px-5 py-1">
                {lineItems.length === 0 ? (
                  <div className="grid grid-cols-[52px_1fr_auto] gap-4 py-3.5 items-center">
                    <div className="w-[52px] h-[52px] rounded-lg bg-paper-2 border border-line flex items-center justify-center text-ink-4">
                      <FileText className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-medium tracking-[-.005em]">
                        Order contents
                      </div>
                      <div className="text-[11.5px] text-ink-3 mt-0.5">
                        Line items temporarily unavailable.
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[13px] font-medium">
                        {totalText}
                      </div>
                      <div className="font-mono text-[11.5px] text-ink-3 mt-0.5">
                        {mapping.documentCurrencyCode}
                      </div>
                    </div>
                  </div>
                ) : (
                  lineItems.map((it, i) => (
                    <div
                      key={it.id ?? i}
                      className={`grid grid-cols-[52px_1fr_auto] items-center gap-4 py-3.5 ${
                        i === 0 ? "" : "border-t border-line-2"
                      }`}
                    >
                      <div className="h-[52px] w-[52px] rounded-[8px] bg-paper-2 border border-line" />
                      <div>
                        <div className="text-[13.5px] font-medium tracking-[-.005em]">
                          {it.name}
                        </div>
                        <div className="mt-[3px] text-[11.5px] text-ink-3">
                          {it.description
                            ? `${it.description}${it.unitCode ? ` · ${it.unitCode}` : ""}`
                            : it.unitCode || "—"}
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

            {/* Delivery card */}
            <div className="border border-line rounded-[12px] bg-paper overflow-hidden">
              <div className="px-5 py-4 border-b border-line-2 bg-paper-2">
                <span className="font-display font-semibold text-[14px] tracking-[-.01em]">
                  Delivery
                </span>
              </div>
              <div className="px-5 py-4 text-[13px] text-ink-2 leading-[1.6]">
                <div className="font-display font-semibold text-ink">
                  {mapping.buyerName}
                </div>
                <div>{mapping.buyerAddress.streetName}</div>
                <div>
                  {mapping.buyerAddress.cityName}{" "}
                  {mapping.buyerAddress.postalZone}
                </div>
                <div>{mapping.buyerAddress.country}</div>
                {mapping.buyerPhone && <div>{mapping.buyerPhone}</div>}
                {mapping.note && (
                  <div className="mt-3 pt-3 border-t border-line-2 italic text-ink-3">
                    &ldquo;{mapping.note}&rdquo;
                  </div>
                )}
                {isCancelled && cancelledEvent?.note && (
                  <div className="mt-3 pt-3 border-t border-line-2 text-s-cancelled-fg">
                    Cancelled · {cancelledEvent.note}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="grid gap-5">
            {/* Totals card */}
            <div className="border border-line rounded-[12px] bg-paper px-5 py-4">
              <div className="flex justify-between items-baseline text-[13px] py-1.5">
                <span className="text-ink-3">Subtotal</span>
                <span className="font-mono font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline text-[13px] py-1.5">
                <span className="text-ink-3">Shipping</span>
                <span className="font-mono font-medium">Free</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-line-2 font-display font-semibold text-[15px]">
                <span>
                  {mapping.status === "paid" ||
                  mapping.status === "despatched" ||
                  mapping.status === "received" ||
                  mapping.status === "invoiced"
                    ? "Paid"
                    : "Total"}
                </span>
                <span className="font-mono text-[16px] font-semibold">
                  {totalText}
                </span>
              </div>
            </div>

            {/* More card */}
            <div className="border border-line rounded-[12px] bg-paper overflow-hidden">
              <div className="px-5 py-4 border-b border-line-2 bg-paper-2">
                <span className="font-display font-semibold text-[14px] tracking-[-.01em]">
                  More
                </span>
              </div>
              <div className="px-5">
                <a
                  href={`/api/orders/${mapping.orderId}/xml${
                    token ? `?t=${token}` : ""
                  }`}
                  className="flex justify-between items-center py-3 text-[13px] text-ink hover:text-hot"
                >
                  <div>
                    <div>Download UBL order (XML)</div>
                    <div className="text-[11.5px] text-ink-3 mt-0.5">
                      For your records.
                    </div>
                  </div>
                  <FileDown className="h-4 w-4 text-ink-4" aria-hidden />
                </a>
                {canDownloadInvoice ? (
                  <a
                    href={`/api/invoices/${mapping.invoiceId}/pdf`}
                    className="flex justify-between items-center py-3 border-t border-line-2 text-[13px] text-ink hover:text-hot"
                  >
                    <div>
                      <div>Download invoice (PDF)</div>
                      <div className="text-[11.5px] text-ink-3 mt-0.5">
                        Issued by {store.storeName}.
                      </div>
                    </div>
                    <FileDown className="h-4 w-4 text-ink-4" aria-hidden />
                  </a>
                ) : (
                  <div className="flex justify-between items-center py-3 border-t border-line-2 text-[13px] text-ink-3 cursor-not-allowed">
                    <div>
                      <div>Invoice will be available on delivery</div>
                      <div className="text-[11.5px] text-ink-4 mt-0.5">
                        Issued by {store.storeName}.
                      </div>
                    </div>
                    <Circle className="h-4 w-4 text-ink-4" aria-hidden />
                  </div>
                )}
                <button
                  type="button"
                  className="w-full flex justify-between items-center py-3 border-t border-line-2 text-[13px] text-ink hover:text-hot text-left"
                >
                  <div>
                    <div>Report an issue</div>
                    <div className="text-[11.5px] text-ink-3 mt-0.5">
                      Damage, wrong item, missing.
                    </div>
                  </div>
                  <Flag className="h-4 w-4 text-ink-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className="w-full flex justify-between items-center py-3 border-t border-line-2 text-[13px] text-ink hover:text-hot text-left"
                >
                  <div>
                    <div>Message the shop</div>
                    <div className="text-[11.5px] text-ink-3 mt-0.5">
                      {store.storeName} usually replies same day.
                    </div>
                  </div>
                  <MessageSquare className="h-4 w-4 text-ink-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MakeRecurringCTA */}
        {showRecurringCta && (
          <div className="mt-5 border border-line rounded-[12px] bg-paper px-[22px] py-[18px] flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[10px] bg-accent-soft text-accent grid place-items-center flex-none">
                <RefreshCw className="h-[18px] w-[18px]" aria-hidden />
              </div>
              <div>
                <div className="font-display font-semibold text-[14.5px] tracking-[-.01em]">
                  Like this order? Make it recurring.
                </div>
                <div className="text-[12.5px] text-ink-3 mt-1">
                  {store.storeName} will re-send these exact items on a schedule
                  of your choosing.
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/store/${storeNav.slug}/recurring`}>
                Set up recurring <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* State reassurance when received but not yet invoiced */}
        {mapping.status === "received" && (
          <div className="mt-5 flex items-center gap-2 text-[12.5px] text-ink-3">
            <Check className="h-4 w-4 text-accent" aria-hidden />
            Received. Your invoice is being prepared.
          </div>
        )}
      </div>
    </>
  );
}
