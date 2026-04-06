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

  // Get order IDs this user has access to
  const orderIds = await getOrderIdsForUser(session.email, session.role, status);

  if (orderIds.length === 0) {
    return NextResponse.json({ orders: [], totalOrders: 0, limit, offset });
  }

  // Fetch all accessible orders from Chalksniffer
  const res = await chalksniffer().get(`/orders?limit=1000&offset=0`);
  if (!res.ok) {
    return NextResponse.json({ orders: [], totalOrders: 0, limit, offset });
  }
  const data = await res.json();

  // Filter to only orders this user has access to
  const idSet = new Set(orderIds);
  const filtered = (data.orders || []).filter(
    (o: { id: string }) => idSet.has(o.id)
  );

  // Apply pagination
  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    orders: paginated,
    totalOrders: filtered.length,
    limit,
    offset,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { sellerEmail, ...orderBody } = body;

  if (!sellerEmail) {
    return NextResponse.json({ error: "sellerEmail is required" }, { status: 400 });
  }

  const res = await chalksniffer().post("/orders", orderBody);
  const data = await res.json();

  if (res.ok && data.id) {
    await setMapping(data.id, {
      orderId: data.id,
      buyerEmail: session.email,
      sellerEmail,
    });
  }

  return NextResponse.json(data, { status: res.status });
}
