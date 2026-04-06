import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { lastminutepush } from "@/lib/api-clients";
import { setMapping } from "@/lib/order-access";

export async function GET(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = request.nextUrl;
  const query = searchParams.toString();
  const res = await lastminutepush().get(`/v1/invoices${query ? `?${query}` : ""}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const res = await lastminutepush().post("/v1/invoices", body);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    console.error("LMP non-JSON response:", res.status, text.slice(0, 200));
    return NextResponse.json({ error: "Invoice service returned an unexpected response" }, { status: 502 });
  }
  const data = await res.json();
  if (res.ok && body.order_reference && data.invoice?.invoice_id) {
    await setMapping(body.order_reference, { invoiceId: data.invoice.invoice_id });
    await lastminutepush().post(`/v1/invoices/${data.invoice.invoice_id}/status`, { status: "sent" });
  }
  return NextResponse.json(data, { status: res.status });
}
