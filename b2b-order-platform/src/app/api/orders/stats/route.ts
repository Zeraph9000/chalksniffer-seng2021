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

  // Requires Attention — orders where you need to act
  const actionRequired = mappings.filter(
    (m) => m.status === "placed" && m[statusField] === "needs_review"
  ).length;

  // Outstanding Value — total $ of unpaid orders (everything not "paid")
  let outstandingValue = 0;
  let outstandingCurrency = "AUD";
  for (const m of mappings) {
    if (m.status !== "paid") {
      outstandingValue += m.payableAmount ?? 0;
      outstandingCurrency = m.documentCurrencyCode || outstandingCurrency;
    }
  }

  // Overdue — despatched orders older than 14 days
  const now = Date.now();
  let overdue = 0;
  for (const m of mappings) {
    if (m.status === "despatched") {
      const age = (now - new Date(m.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (age > 14) overdue++;
    }
  }

  // Earned This Month — total $ of paid orders this month (seller only)
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  let earnedThisMonth = 0;
  if (session.role === "seller") {
    for (const m of mappings) {
      if (m.status === "paid" && m.createdAt && new Date(m.createdAt).toISOString().split("T")[0] >= monthStartStr) {
        earnedThisMonth += m.payableAmount ?? 0;
      }
    }
  }

  return NextResponse.json({
    role: session.role,
    actionRequired,
    outstandingValue,
    outstandingCurrency,
    overdue,
    earnedThisMonth,
  });
}
