import { redirect } from "next/navigation";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Store, OrderMapping } from "@/lib/types";
import { DashboardShell } from "@/components/ledgr/dashboard-shell";
import { InvoiceDetailClient } from "./invoice-detail-client";

export const dynamic = "force-dynamic";

function monogramFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function SellerInvoiceDetailPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") redirect("/dashboard/login");

  const client = await clientPromise;
  const db = client.db();

  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
  if (!store) redirect("/dashboard/store");

  const awaitingDespatch = await db
    .collection<OrderMapping>("orderMappings")
    .countDocuments({ storeId: store.storeId, status: "paid" });

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
      ordersBadge={awaitingDespatch}
    >
      <InvoiceDetailClient />
    </DashboardShell>
  );
}
