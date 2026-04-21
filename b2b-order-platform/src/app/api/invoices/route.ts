import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { OrderMapping, Store } from "@/lib/types";

/**
 * List invoices for the authenticated user.
 *
 * - Seller: all invoices generated for their store's orders.
 * - Buyer:  all invoices on their own past orders.
 *
 * This list is built from our OrderMapping (only includes orders that
 * successfully produced an invoiceId). Detail/PDF for a specific invoice hits
 * LastMinutePush via the [id] passthrough.
 */
export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();

  let filter: Record<string, unknown>;
  if (session.role === "seller") {
    const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
    if (!store) return NextResponse.json({ items: [] });
    filter = { storeId: store.storeId, invoiceId: { $exists: true } };
  } else {
    filter = { buyerId: session.userId, invoiceId: { $exists: true } };
  }

  const mappings = await db
    .collection<OrderMapping>("orderMappings")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  const items = mappings.map((m) => ({
    invoice_id: m.invoiceId,
    status: "issued" as const,
    order_reference: m.orderId,
    issue_date: m.issueDate,
    due_date: null,
    payable_amount: m.payableAmount,
    currency: m.documentCurrencyCode,
    buyer_name: m.buyerName,
    buyer_email: m.buyerEmail,
    created_at: m.createdAt,
  }));

  return NextResponse.json({ items });
}
