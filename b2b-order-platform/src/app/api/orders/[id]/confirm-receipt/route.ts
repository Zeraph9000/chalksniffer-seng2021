import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { despatch } from "@/lib/despatch-client";
import { invoiceApi } from "@/lib/invoice-client";
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

  // Receipt advice
  const receipt = {
    documentID: `${params.id}-r`,
    senderId: auth.mapping.buyerEmail,
    receiverId: auth.mapping.sellerId,
    copyIndicator: false,
    documentStatusCode: "Completed",
    orderReference: { id: params.id, issueDate: auth.mapping.issueDate },
    despatchDocumentReference: auth.mapping.despatchDocumentId ? { id: auth.mapping.despatchDocumentId } : undefined,
    deliveryCustomerParty: { party: { name: auth.mapping.buyerName, postalAddress: { ...auth.mapping.buyerAddress, countryIdentificationCode: auth.mapping.buyerAddress.country } } },
    despatchSupplierParty: { party: { name: auth.mapping.sellerId, postalAddress: { streetName: "", cityName: "", postalZone: "", countryIdentificationCode: "AU" } } },
    shipment: { id: params.id, consignmentId: params.id, delivery: { actualDeliveryDate: new Date().toISOString().split("T")[0] } },
    receiptLines: [],
  };
  const rr = await despatch.createReceiptAdvice(receipt as unknown as Record<string, unknown>);
  if (!rr.ok) return NextResponse.json({ error: "RECEIPT_API_FAILED", status: rr.status }, { status: 503 });

  await setMappingField(db, params.id, { receiptAdviceId: rr.uuid });
  const t1 = await transitionStatus(db, params.id, "received", auth.mapping.buyerId, `receipt ${rr.uuid}`);
  if (isOrderServiceError(t1)) return NextResponse.json({ error: t1.error, message: t1.message }, { status: t1.status });

  // Auto-generate invoice on received. Non-blocking if invoice API fails — order stays at received.
  const invoice = {
    order_reference: params.id,
    customer_id: auth.mapping.buyerEmail,
    issue_date: new Date().toISOString().split("T")[0],
    currency: auth.mapping.documentCurrencyCode,
    customer: { name: auth.mapping.buyerName, identifier: auth.mapping.buyerEmail },
    items: [],
  };
  const inv = await invoiceApi.createInvoice(invoice as unknown as Record<string, unknown>);
  if (inv.ok) {
    await setMappingField(db, params.id, { invoiceId: inv.invoiceId });
    await transitionStatus(db, params.id, "invoiced", null, `invoice ${inv.invoiceId}`);
  }

  return NextResponse.json({ status: "received", invoiced: inv.ok, invoiceId: inv.ok ? inv.invoiceId : null });
}
