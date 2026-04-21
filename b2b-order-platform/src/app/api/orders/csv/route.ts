import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import type { Store, OrderMapping } from "@/lib/types";

export async function GET(_request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();

  let mappings: OrderMapping[];
  if (session.role === "seller") {
    const store = await db.collection<Store>("stores").findOne({ userId: session.userId });
    if (!store) return NextResponse.json({ error: "NO_STORE" }, { status: 404 });
    mappings = await db.collection<OrderMapping>("orderMappings").find({ storeId: store.storeId }).toArray();
  } else {
    mappings = await db.collection<OrderMapping>("orderMappings").find({ buyerId: session.userId }).toArray();
  }

  const header = "orderId,status,buyerEmail,total,currency,createdAt";
  const rows = mappings.map((m) =>
    [m.orderId, m.status, m.buyerEmail, m.payableAmount, m.documentCurrencyCode, m.createdAt.toISOString()]
      .map((v) => String(v).replace(/"/g, '""'))
      .map((v) => `"${v}"`)
      .join(",")
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders.csv"`,
    },
  });
}
