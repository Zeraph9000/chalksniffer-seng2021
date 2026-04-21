import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { transitionStatus, isOrderServiceError } from "@/lib/order-service";
import { stripePlaceholder } from "@/lib/stripe-placeholder";
import { OrderMapping } from "@/lib/types";

export async function POST(_request: NextRequest, { params }: { params: { paymentIntentId: string } }) {
  const client = await clientPromise;
  const db = client.db();

  const mapping = await db.collection<OrderMapping>("orderMappings").findOne({ stripePaymentIntentId: params.paymentIntentId });
  if (!mapping) return NextResponse.json({ error: "NOT_FOUND", message: "payment intent unknown" }, { status: 404 });

  const confirm = stripePlaceholder.confirmPayment(params.paymentIntentId);
  if (!confirm.ok) return NextResponse.json({ error: "PAYMENT_FAILED", message: "mock failure" }, { status: 402 });

  const result = await transitionStatus(db, mapping.orderId, "paid", null, "stripe placeholder ok");
  if (isOrderServiceError(result)) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }
  return NextResponse.json({ status: "paid", orderId: mapping.orderId });
}
