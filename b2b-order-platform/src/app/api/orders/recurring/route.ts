import { NextResponse } from "next/server";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { chalksniffer } from "@/lib/chalksniffer-client";

export async function GET() {
  const buyer = await getBuyerSessionOrNull();
  if (!buyer) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const rows = await chalksniffer.listRecurring(buyer.userId);
  return NextResponse.json(rows ?? []);
}
