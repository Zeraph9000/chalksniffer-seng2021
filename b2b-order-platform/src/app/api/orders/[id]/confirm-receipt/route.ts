import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { invoiceApi } from "@/lib/invoice-client";
import { chalksniffer } from "@/lib/chalksniffer-client";
import { buildInvoiceItems, UblLineForInvoice } from "@/lib/invoice-builder";
import { transitionStatus, setMappingField, isOrderServiceError } from "@/lib/order-service";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.nextUrl.searchParams.get("t");
  const client = await clientPromise;
  const db = client.db();

  const auth = await authorizeOrderAccess(db, params.id, token);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.role === "seller") return NextResponse.json({ error: "FORBIDDEN", message: "buyer action only" }, { status: 403 });

  if (auth.mapping.status !== "despatched") {
    return NextResponse.json({ error: "INVALID_STATE", message: `cannot receive from ${auth.mapping.status}` }, { status: 400 });
  }

  // Receipt advice is internal: DespatchV2 does not expose a receipt-advice endpoint.
  // Record a synthetic receipt ID so the OrderMapping retains a stable reference.
  const receiptAdviceId = `internal-${crypto.randomBytes(8).toString("hex")}`;
  await setMappingField(db, params.id, { receiptAdviceId });

  const t1 = await transitionStatus(db, params.id, "received", auth.mapping.buyerId, `receipt ${receiptAdviceId}`);
  if (isOrderServiceError(t1)) return NextResponse.json({ error: t1.error, message: t1.message }, { status: t1.status });

  // Auto-generate invoice with REAL items from the UBL order. Non-blocking if invoice API fails.
  const ubl = await chalksniffer.getOrder(params.id);
  let invoiceId: string | null = null;
  let invoicedOk = false;
  if (ubl && typeof ubl === "object" && "orderLines" in ubl) {
    const lines = (ubl as unknown as { orderLines: UblLineForInvoice[] }).orderLines;
    const items = buildInvoiceItems(lines);
    const invoice = {
      order_reference: params.id,
      customer_id: auth.mapping.buyerEmail,
      issue_date: new Date().toISOString().split("T")[0],
      currency: auth.mapping.documentCurrencyCode,
      customer: { name: auth.mapping.buyerName, identifier: auth.mapping.buyerEmail },
      items,
    };
    const inv = await invoiceApi.createInvoice(invoice as unknown as Record<string, unknown>);
    if (inv.ok) {
      invoiceId = inv.invoiceId;
      invoicedOk = true;
      await setMappingField(db, params.id, { invoiceId });
      await transitionStatus(db, params.id, "invoiced", null, `invoice ${invoiceId}`);
    }
  }

  return NextResponse.json({ status: "received", invoiced: invoicedOk, invoiceId });
}
