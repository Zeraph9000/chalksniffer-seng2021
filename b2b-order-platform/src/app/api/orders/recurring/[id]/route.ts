import { NextRequest, NextResponse } from "next/server";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { chalksniffer } from "@/lib/chalksniffer-client";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const buyer = await getBuyerSessionOrNull();
  if (!buyer) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const row = await chalksniffer.getRecurring(params.id);
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const buyer = await getBuyerSessionOrNull();
  if (!buyer) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json();
  const result = await chalksniffer.updateRecurring(params.id, body);
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const buyer = await getBuyerSessionOrNull();
  if (!buyer) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const result = await chalksniffer.deleteRecurring(params.id);
  return new NextResponse(null, { status: result.status });
}
