import { NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { OrderMapping, Order } from "@/lib/types";

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

  const orderIds = mappings.map((m) => m.orderId);

  const orders = orderIds.length > 0
    ? await db.collection<Order>("orders").find({ id: { $in: orderIds } }).toArray()
    : [];

  const orderMap = new Map<string, Order>();
  for (const o of orders) {
    orderMap.set(o.id, o);
  }

  // Requires Attention — orders where you need to act
  const actionRequired = mappings.filter(
    (m) => m.status === "placed" && m[statusField] === "needs_review"
  ).length;

  // Outstanding Value — total $ of unpaid orders (everything not "paid")
  let outstandingValue = 0;
  let outstandingCurrency = "AUD";
  for (const m of mappings) {
    if (m.status !== "paid") {
      const order = orderMap.get(m.orderId);
      if (order) {
        const amount = order.anticipatedMonetaryTotal?.payableAmount
          ?? order.orderLines.reduce((sum, line) => sum + line.lineItem.price.priceAmount * line.lineItem.quantity, 0);
        outstandingValue += amount;
        outstandingCurrency = order.documentCurrencyCode || outstandingCurrency;
      }
    }
  }

  // Overdue — despatched orders past their requested delivery date
  const today = new Date().toISOString().split("T")[0];
  let overdue = 0;
  for (const m of mappings) {
    if (m.status === "despatched") {
      const order = orderMap.get(m.orderId);
      const endDate = order?.delivery?.requestedDeliveryPeriod?.endDate;
      if (endDate && endDate < today) {
        overdue++;
      }
    }
  }

  // Month to Date — total $ of orders placed this month
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  let monthToDate = 0;
  for (const m of mappings) {
    const order = orderMap.get(m.orderId);
    if (order && order.issueDate >= monthStartStr) {
      const amount = order.anticipatedMonetaryTotal?.payableAmount
        ?? order.orderLines.reduce((sum, line) => sum + line.lineItem.price.priceAmount * line.lineItem.quantity, 0);
      monthToDate += amount;
    }
  }

  return NextResponse.json({
    actionRequired,
    outstandingValue,
    outstandingCurrency,
    overdue,
    monthToDate,
  });
}
