import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import type { OrderMapping } from "@/lib/types";

/**
 * Stream an invoice PDF from LastMinutePush after authorising via OrderMapping.
 * Passed the Authorization header for LastMinutePush server-side; browser only
 * sees our wrapped route.
 */
const BASE_URL = process.env.INVOICE_BASE_URL || "https://lastminutepush.one";
const API_KEY = process.env.INVOICE_API_KEY || "";

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

  const upstream = await fetch(`${BASE_URL}/v1/invoices/${encodeURIComponent(params.id)}/pdf`, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: "UPSTREAM_PDF_FAILED", status: upstream.status }, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${params.id}.pdf"`,
    },
  });
}
