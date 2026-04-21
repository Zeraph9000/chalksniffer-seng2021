import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { getMapping, transitionStatus, isOrderServiceError } from "@/lib/order-service";
import { stripePlaceholder } from "@/lib/stripe-placeholder";
import { restoreVariantStock } from "@/lib/product-service";
import { chalksniffer } from "@/lib/chalksniffer-client";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") {
    return NextResponse.json({ error: "FORBIDDEN", message: "sellers only" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { reason?: string };

  const client = await clientPromise;
  const db = client.db();

  const mapping = await getMapping(db, params.id);
  if (!mapping || mapping.sellerId !== session.userId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (mapping.status !== "placed" && mapping.status !== "paid") {
    return NextResponse.json({ error: "INVALID_STATE", message: `cannot cancel from ${mapping.status}` }, { status: 400 });
  }

  // Refund (placeholder) if paid
  if (mapping.status === "paid" && mapping.stripePaymentIntentId) {
    stripePlaceholder.refund(mapping.stripePaymentIntentId);
  }

  // Restore stock from Chalksniffer order lines. Each lineItem.item.sellersItemIdentification = variantId.
  const order = await chalksniffer.getOrder(params.id);
  if (order && typeof order === "object" && "orderLines" in order) {
    type Line = { lineItem: { quantity: number; item: { sellersItemIdentification: string } } };
    const lines = (order as unknown as { orderLines: Line[] }).orderLines ?? [];
    for (const l of lines) {
      const product = await db.collection("products").findOne({ "variants.variantId": l.lineItem.item.sellersItemIdentification });
      if (product) {
        await restoreVariantStock(db, (product as unknown as { productId: string }).productId, l.lineItem.item.sellersItemIdentification, l.lineItem.quantity);
      }
    }
  }

  const t = await transitionStatus(db, params.id, "cancelled", session.userId, body.reason || "seller cancellation");
  if (isOrderServiceError(t)) return NextResponse.json({ error: t.error, message: t.message }, { status: t.status });

  return NextResponse.json({ status: "cancelled", reason: body.reason });
}
