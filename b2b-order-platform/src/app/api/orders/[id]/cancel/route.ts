import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { transitionStatus, isOrderServiceError } from "@/lib/order-service";
import { stripePlaceholder } from "@/lib/stripe-placeholder";
import { restoreVariantStock } from "@/lib/product-service";
import { chalksniffer } from "@/lib/chalksniffer-client";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const client = await clientPromise;
  const db = client.db();

  const auth = await authorizeOrderAccess(db, params.id, null);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.role !== "seller") {
    return NextResponse.json({ error: "FORBIDDEN", message: "sellers only" }, { status: 403 });
  }
  const mapping = auth.mapping;

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
      } else {
        // Variant vanished (soft-deleted or schema drift) — refund still happens, but stock cannot be restored.
        console.warn(`[cancel] no product for variantId=${l.lineItem.item.sellersItemIdentification} on order=${params.id}; stock not restored`);
      }
    }
  }

  const reason = body.reason || "seller cancellation";
  // (use `reason` for both the transition and the response so the client sees what was persisted)
  const t = await transitionStatus(db, params.id, "cancelled", auth.userId, reason);
  if (isOrderServiceError(t)) return NextResponse.json({ error: t.error, message: t.message }, { status: t.status });

  return NextResponse.json({ status: "cancelled", reason });
}
