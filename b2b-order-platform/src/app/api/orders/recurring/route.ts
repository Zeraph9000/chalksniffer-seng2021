import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";

/**
 * Passthrough to Chalksniffer's /orders/recurring endpoints.
 * Authed buyers only. Actual recurring-order logic lives in Chalksniffer.
 */
const CHALK_BASE = process.env.CHALKSNIFFER_BASE_URL || "https://www.chalksniffer.com";
const CHALK_KEY = process.env.CHALKSNIFFER_API_KEY || "";

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await request.json();
  const res = await fetch(`${CHALK_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: CHALK_KEY },
    body: JSON.stringify({ ...body, recurring: true }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  // No global "list recurring for user" endpoint on Chalksniffer yet;
  // return an empty array for now. Frontend can enrich once Chalksniffer exposes it.
  return NextResponse.json([]);
}
