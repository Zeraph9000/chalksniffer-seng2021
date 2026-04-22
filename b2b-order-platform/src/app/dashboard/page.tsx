import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Plus,
  ShoppingCart,
  Package,
  RefreshCcw,
  Truck,
  Store as StoreIcon,
  FileText,
  LayoutGrid,
} from "lucide-react";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { OrderMapping, Product, Store } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardShell } from "@/components/ledgr/dashboard-shell";
import { RevenueChartCard } from "@/components/ledgr/revenue-chart-card";
import { KpiTile } from "@/components/ledgr/kpi-tile";
import { NeedsAttentionPanel } from "@/components/ledgr/needs-attention-panel";

type ChipTone =
  | "placed"
  | "paid"
  | "despatched"
  | "received"
  | "invoiced"
  | "cancelled";

/** Build 30 daily revenue bars (oldest → newest) in dollars from order createdAt + payableAmount. */
function buildDailyBars(orders: { createdAt: Date | string; payableAmount?: number; status?: string }[]): number[] {
  const bars = new Array(30).fill(0) as number[];
  const now = Date.now();
  const MS_DAY = 24 * 60 * 60 * 1000;
  // Day 0 = today, bar index 29 = today, bar index 0 = 29 days ago.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startMs = startOfToday.getTime();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const t = new Date(o.createdAt).getTime();
    const daysAgo = Math.floor((startMs - t) / MS_DAY);
    // daysAgo 0 = today, 29 = 29 days ago. Negative daysAgo means today (edge case from same-day fractional).
    const idx = 29 - Math.max(0, daysAgo);
    if (idx < 0 || idx >= 30) continue;
    bars[idx] += o.payableAmount ?? 0;
  }
  return bars;
}

function monogramFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(date);
}

const CHIP_TONE: Record<string, ChipTone> = {
  placed: "placed",
  paid: "paid",
  despatched: "despatched",
  received: "received",
  invoiced: "invoiced",
  cancelled: "cancelled",
};

export default async function SellerDashboardPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });

  // User derived info (always available)
  const firstName = session.name.split(/\s+/)[0] ?? session.name;
  const initials = monogramFrom(session.name);

  if (!store) {
    const placeholderStore = {
      monogram: "--",
      name: "No store yet",
      status: "closed" as const,
    };
    return (
      <DashboardShell
        store={placeholderStore}
        user={{ name: session.name, initials }}
        active="dashboard"
      >
        <div className="px-8 py-16 max-w-3xl mx-auto">
          <EmptyState
            icon={<StoreIcon className="h-6 w-6" strokeWidth={1.6} />}
            title="Open your store to get started"
            body="You haven't created a store yet. Set up your storefront to start listing products and taking orders."
            action={undefined}
            className="mx-auto"
          />
          <div className="mt-6 text-center">
            <Button asChild>
              <Link href="/dashboard/store">Create store</Link>
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // Queries scoped to this store
  let orders: OrderMapping[] = [];
  let products: Product[] = [];
  try {
    orders = await db
      .collection<OrderMapping>("orderMappings")
      .find({ storeId: store.storeId })
      .sort({ createdAt: -1 })
      .toArray();
  } catch {
    orders = [];
  }
  try {
    products = await db
      .collection<Product>("products")
      .find({ storeId: store.storeId })
      .toArray();
  } catch {
    products = [];
  }

  // Revenue calculations
  const now = Date.now();
  const MS_30D = 30 * 24 * 60 * 60 * 1000;
  const windowStart = now - MS_30D;
  const windowStartPrev = now - 2 * MS_30D;

  const revenue = orders
    .filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= windowStart && o.status !== "cancelled";
    })
    .reduce((acc, o) => acc + (o.payableAmount ?? 0), 0);

  const previousRevenue = orders
    .filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= windowStartPrev && t < windowStart && o.status !== "cancelled";
    })
    .reduce((acc, o) => acc + (o.payableAmount ?? 0), 0);

  const orders30d = orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= windowStart;
  });
  const orders30dCount = orders30d.length;
  const paidCount = orders30d.filter((o) => o.status === "paid").length;
  const awaitingDespatch = orders.filter((o) => o.status === "paid");

  // Products sold counts — approximated via mapping count since line items aren't modelled here.
  // We instead show the count of orders in period.
  const productsSold30d = orders30d.filter((o) => o.status !== "cancelled").length;

  const lowStock = products
    .map((p) => {
      const totalStock = (p.variants ?? []).reduce(
        (acc, v) => acc + (typeof v.stock === "number" ? v.stock : 0),
        0
      );
      const minPrice = (p.variants ?? []).reduce(
        (acc, v) => (typeof v.price === "number" && v.price < acc ? v.price : acc),
        Number.POSITIVE_INFINITY
      );
      return { product: p, totalStock, minPrice: isFinite(minPrice) ? minPrice : 0 };
    })
    .filter(({ totalStock }) => totalStock <= 5)
    .sort((a, b) => a.totalStock - b.totalStock)
    .slice(0, 5);

  const recentOrders = orders.slice(0, 6);

  return (
    <DashboardShell
      store={{
        monogram: monogramFrom(store.storeName),
        name: store.storeName,
        status: store.status,
        slug: store.slug,
      }}
      user={{ name: session.name, initials }}
      active="dashboard"
      ordersBadge={awaitingDespatch.length}
    >
      {/* Sticky header */}
      <div className="sticky top-0 bg-paper border-b border-line px-8 py-6 z-10 flex justify-between items-end gap-4">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-[-.02em] m-0">
            Dashboard
          </h1>
          <p className="text-[13px] text-ink-3 mt-[3px]">
            Welcome back, {firstName} — here&apos;s the shop this morning.
          </p>
        </div>
        <div className="flex gap-2">
          {store.slug ? (
            <Button asChild variant="ghost" size="md">
              <Link href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer">
                View public storefront
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
          <Button asChild size="md">
            <Link href="/dashboard/products/new">
              <Plus className="h-3.5 w-3.5" />
              Add product
            </Link>
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="px-8 py-7 pb-12 flex flex-col gap-6">

        {/* Revenue + KPIs */}
        <div className="grid grid-cols-[1.6fr_1fr] gap-[18px]">
          <RevenueChartCard
            revenue={revenue}
            previousRevenue={previousRevenue}
            bars={buildDailyBars(orders)}
          />
          <div className="flex flex-col gap-[18px]">
            <KpiTile
              tone="orders"
              icon={<ShoppingCart className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              label="Orders · 30d"
              value={orders30dCount}
              sublabel={
                <>
                  {paidCount} paid · {awaitingDespatch.length} awaiting despatch
                </>
              }
            />
            <KpiTile
              tone="sold"
              icon={<Package className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              label="Products sold · 30d"
              value={productsSold30d}
              sublabel={
                products.length > 0
                  ? `${products.length} product${products.length === 1 ? "" : "s"} in catalogue`
                  : "No products yet"
              }
            />
            <KpiTile
              tone="recur"
              icon={<RefreshCcw className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              label="Active recurring"
              value={0}
              sublabel="No scheduled orders"
            />
          </div>
        </div>

        {/* Needs attention */}
        <div className="grid grid-cols-[1.3fr_1fr] gap-[18px]">
          <NeedsAttentionPanel
            title="Orders awaiting despatch"
            subtitle="Paid but not yet shipped."
            countLabel={
              awaitingDespatch.length > 0
                ? `${awaitingDespatch.length} waiting`
                : "All caught up"
            }
            tone="warn"
          >
            {awaitingDespatch.length === 0 ? (
              <div className="px-[22px] py-6 text-[13px] text-ink-3">
                Nothing waiting — paid orders appear here when they need despatch.
              </div>
            ) : (
              awaitingDespatch.slice(0, 4).map((o) => (
                <div
                  key={o.orderId}
                  className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 items-center px-[22px] py-3.5 border-t border-line-2 first:border-t-0"
                >
                  <div>
                    <div className="font-mono text-[12.5px] font-medium text-ink">
                      {o.orderId}
                    </div>
                    <div className="text-[11.5px] text-ink-3 mt-0.5">
                      {formatShortDate(o.createdAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12.5px] text-ink-2 font-medium truncate">
                      {o.buyerName}
                    </div>
                    <div className="text-[11.5px] text-ink-3 mt-0.5 truncate">
                      {o.buyerAddress?.cityName ?? ""}
                      {o.buyerAddress?.postalZone ? ` ${o.buyerAddress.postalZone}` : ""}
                    </div>
                  </div>
                  <div className="font-mono text-[12.5px] font-medium text-ink">
                    {formatMoney(o.payableAmount ?? 0)}
                  </div>
                  <Button asChild size="sm" variant="primary">
                    <Link href={`/dashboard/orders/${o.orderId}`}>
                      <Truck className="h-3.5 w-3.5" />
                      Mark despatched
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </NeedsAttentionPanel>

          <NeedsAttentionPanel
            title="Low stock"
            subtitle="At or below 5 units remaining."
            countLabel={
              lowStock.length > 0 ? `${lowStock.length} item${lowStock.length === 1 ? "" : "s"}` : "All good"
            }
            tone="warn"
            footerLink={lowStock.length > 0 ? { label: "Manage stock", href: "/dashboard/products" } : undefined}
          >
            {lowStock.length === 0 ? (
              <div className="px-[22px] py-6 text-[13px] text-ink-3">
                All variants have comfortable stock.
              </div>
            ) : (
              lowStock.map(({ product, totalStock, minPrice }) => (
                <div
                  key={product.productId}
                  className="grid grid-cols-[32px_1fr_auto] gap-3 items-center px-[22px] py-3 border-t border-line-2 first:border-t-0"
                >
                  <div
                    className="w-8 h-8 rounded-[6px] bg-brand-soft grid place-items-center overflow-hidden"
                    aria-hidden
                  >
                    {product.imageUrls?.[0] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={product.imageUrls[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-4 w-4 text-brand-ink" strokeWidth={1.6} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-ink truncate">
                      {product.name}
                    </div>
                    <div className="text-[11px] text-ink-3 mt-0.5 truncate">
                      {product.variants?.length ?? 0} variant
                      {(product.variants?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                      {formatMoney(minPrice)}
                    </div>
                  </div>
                  <div
                    className={
                      totalStock === 0
                        ? "font-mono text-[12px] text-danger font-medium inline-flex items-center gap-1.5 before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-danger"
                        : "font-mono text-[12px] text-warn font-medium inline-flex items-center gap-1.5 before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-warn"
                    }
                  >
                    {totalStock === 0 ? "Out" : `${totalStock} left`}
                  </div>
                </div>
              ))
            )}
          </NeedsAttentionPanel>
        </div>

        {/* Recent orders */}
        <section className="bg-paper border border-line rounded-[14px] overflow-hidden">
          <header className="px-[22px] py-4 border-b border-line-2 flex justify-between items-center">
            <div>
              <div className="font-display font-semibold text-[14px] tracking-[-.01em] text-ink">
                Recent orders
              </div>
              <div className="text-[12px] text-ink-3 mt-px">
                Last 6 — view all in the Orders tab.
              </div>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-[12.5px] font-medium text-ink hover:text-hot"
            >
              See all →
            </Link>
          </header>

          {recentOrders.length === 0 ? (
            <div className="px-[22px] py-10 text-center text-[13px] text-ink-3">
              No orders yet. Your first sale will appear here.
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1.2fr_1.2fr_1.4fr_1.2fr_0.9fr_40px] gap-4 px-[22px] py-3 bg-paper-2 border-b border-line-2 text-[10.5px] uppercase tracking-[0.12em] text-ink-3 font-medium">
                <div>Order</div>
                <div>Buyer</div>
                <div>Placed</div>
                <div>Status</div>
                <div className="text-right">Total</div>
                <div />
              </div>
              {recentOrders.map((o) => (
                <Link
                  key={o.orderId}
                  href={`/dashboard/orders/${o.orderId}`}
                  className="grid grid-cols-[1.2fr_1.2fr_1.4fr_1.2fr_0.9fr_40px] gap-4 px-[22px] py-3 items-center border-t border-line-2 first:border-t-0 text-[13px] hover:bg-paper-2 transition-colors"
                >
                  <div className="font-mono font-medium">{o.orderId}</div>
                  <div className="min-w-0">
                    <div className="font-medium text-ink-2 truncate">{o.buyerName}</div>
                    <div className="font-mono text-[11.5px] text-ink-3 mt-0.5 truncate">
                      {o.buyerEmail}
                    </div>
                  </div>
                  <div className="text-ink-2">{formatDate(o.createdAt)}</div>
                  <div>
                    <Chip tone={CHIP_TONE[o.status] ?? "neutral"} withDot>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </Chip>
                  </div>
                  <div className="font-mono font-medium text-right">
                    {formatMoney(o.payableAmount ?? 0)}
                  </div>
                  <div className="text-ink-4 text-right">→</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <div className="grid grid-cols-4 gap-3">
          <QuickLinkCard
            href="/dashboard/products/new"
            icon={<Plus className="h-4 w-4" strokeWidth={1.6} />}
            title="Add a product"
            description="New SKU with variants, price, and stock."
          />
          <QuickLinkCard
            href="/dashboard/store"
            icon={<StoreIcon className="h-4 w-4" strokeWidth={1.6} />}
            title="Edit store details"
            description="Name, banner, category, location."
          />
          <QuickLinkCard
            href="/dashboard/invoices"
            icon={<FileText className="h-4 w-4" strokeWidth={1.6} />}
            title="Issue an invoice"
            description="Generate an invoice from a received order."
          />
          <QuickLinkCard
            href={store.slug ? `/store/${store.slug}` : "/dashboard/store"}
            icon={<LayoutGrid className="h-4 w-4" strokeWidth={1.6} />}
            title="View public storefront"
            description={
              store.slug
                ? `See how buyers see ${store.storeName} right now.`
                : "Set a slug on the store page to share your public link."
            }
            external={Boolean(store.slug)}
          />
        </div>
      </div>
    </DashboardShell>
  );
}

function QuickLinkCard({
  href,
  icon,
  title,
  description,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="bg-paper border border-line rounded-[12px] p-5 flex flex-col gap-2.5 cursor-pointer transition-colors hover:border-ink"
    >
      <div className="w-[34px] h-[34px] rounded-[8px] bg-paper-2 text-ink-2 grid place-items-center">
        {icon}
      </div>
      <div className="font-display font-semibold text-[13.5px] tracking-[-.005em] text-ink">
        {title}
      </div>
      <div className="text-[11.5px] text-ink-3 leading-[1.5]">{description}</div>
    </Link>
  );
}
