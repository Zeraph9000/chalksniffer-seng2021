import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { getMapping, setMapping } from "@/lib/order-access";

export async function GET(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = request.nextUrl.searchParams.get("orderId");
  if (orderId) {
    const mapping = await getMapping(orderId);
    return NextResponse.json(mapping || { orderId, status: "placed" });
  }

  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const mapping = await setMapping(body.orderId, body);
  return NextResponse.json(mapping);
}
