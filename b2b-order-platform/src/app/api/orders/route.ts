import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { chalksniffer } from "@/lib/api-clients";
import { setMapping, getOrderIdsForUser } from "@/lib/order-access";

export async function GET(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") || undefined;
  const limit = Number(searchParams.get("limit") || "20");
  const offset = Number(searchParams.get("offset") || "0");
  const orderIds = await getOrderIdsForUser(session.email, session.role, status);
  if (orderIds.length === 0) {
    return NextResponse.json({ orders: [], totalOrders: 0, limit, offset });
  }
  const res = await chalksniffer().get(`/orders?limit=500&offset=0`);
  if (!res.ok) return NextResponse.json({ orders: [], totalOrders: 0, limit, offset });
  const data = await res.json();
  const idSet = new Set(orderIds);
  const filtered = (data.orders || []).filter((o: { id: string }) => idSet.has(o.id));
  // Sort by mapping order (newest first — orderIds already sorted by createdAt desc)
  const idOrder = new Map(orderIds.map((id: string, i: number) => [id, i]));
  filtered.sort((a: { id: string }, b: { id: string }) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));
  const paginated = filtered.slice(offset, offset + limit);
  return NextResponse.json({ orders: paginated, totalOrders: filtered.length, limit, offset });
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { sellerEmail, ...orderBody } = body;
  if (!sellerEmail) return NextResponse.json({ error: "sellerEmail is required" }, { status: 400 });
  const res = await chalksniffer().post("/orders", orderBody);
  const data = await res.json();
  if (res.ok && data.id) {
    await setMapping(data.id, {
      orderId: data.id, buyerEmail: session.email, sellerEmail,
      buyerStatus: "under_review", sellerStatus: "needs_review",
    });
  }
  return NextResponse.json(data, { status: res.status });
}
