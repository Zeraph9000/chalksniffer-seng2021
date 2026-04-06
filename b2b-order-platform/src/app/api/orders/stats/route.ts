import { NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { OrderMapping } from "@/lib/types";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();

  const emailField = session.role === "buyer" ? "buyerEmail" : "sellerEmail";
  const statusField = session.role === "buyer" ? "buyerStatus" : "sellerStatus";

  const mappings = await db
    .collection<OrderMapping>("orderMappings")
    .find({ [emailField]: session.email })
    .toArray();

  const total = mappings.length;
  const awaitingReview = mappings.filter(
    (m) => m.status === "placed" && m[statusField] === "under_review"
  ).length;
  const actionRequired = mappings.filter(
    (m) => m.status === "placed" && m[statusField] === "needs_review"
  ).length;
  const despatched = mappings.filter((m) => m.status === "despatched").length;
  const received = mappings.filter((m) => m.status === "received").length;
  const invoiced = mappings.filter((m) => m.status === "invoiced").length;
  const paid = mappings.filter((m) => m.status === "paid").length;

  return NextResponse.json({
    total,
    actionRequired,
    awaitingReview,
    despatched,
    received,
    invoiced,
    paid,
  });
}
