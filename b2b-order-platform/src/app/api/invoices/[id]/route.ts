import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { invoiceApi } from "@/lib/invoice-client";
import type { OrderMapping } from "@/lib/types";

/**
 * Fetch a single invoice from LastMinutePush.
 * Authorises via the OrderMapping that owns `invoiceId` — buyer (session or
 * guest token) or the owning seller can read. Anyone else → 404 (no leak).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.nextUrl.searchParams.get("t");
  const client = await clientPromise;
  const db = client.db();

  const mapping = await db
    .collection<OrderMapping>("orderMappings")
    .findOne({ invoiceId: params.id });
  if (!mapping) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const auth = await authorizeOrderAccess(db, mapping.orderId, token);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const invoice = await invoiceApi.getInvoice(params.id);
  if (!invoice) return NextResponse.json({ error: "UPSTREAM_UNAVAILABLE" }, { status: 502 });

  return NextResponse.json(invoice);
}
