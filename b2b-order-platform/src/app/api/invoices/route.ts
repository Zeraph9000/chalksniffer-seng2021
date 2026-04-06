import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { lastminutepush } from "@/lib/api-clients";
import { setMapping } from "@/lib/order-access";

export async function GET(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const query = searchParams.toString();
  const res = await lastminutepush(session).get(`/v1/invoices${query ? `?${query}` : ""}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const res = await lastminutepush(session).post("/v1/invoices", body);
  const data = await res.json();

  if (res.ok && body.order_reference && data.invoice?.invoice_id) {
    await setMapping(body.order_reference, { invoiceId: data.invoice.invoice_id });
  }

  return NextResponse.json(data, { status: res.status });
}
