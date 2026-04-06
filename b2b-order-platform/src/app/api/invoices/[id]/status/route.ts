import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { lastminutepush } from "@/lib/api-clients";
import { getMappingByInvoice, setMapping } from "@/lib/order-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  if (body.status === "paid") {
    // Ensure sent first (ignore error if already sent)
    await lastminutepush().post(`/v1/invoices/${id}/status`, { status: "sent" });

    // Transition to paid
    const res = await lastminutepush().post(`/v1/invoices/${id}/status`, body);
    const data = await res.json();

    // Update order mapping even if LMP returns 409 (already paid)
    const mapping = await getMappingByInvoice(id);
    if (mapping) {
      await setMapping(mapping.orderId, { status: "paid" } as Partial<typeof mapping>);
    }

    if (res.ok || res.status === 409) {
      return NextResponse.json({ message: "Invoice marked as paid", status: "paid" });
    }
    return NextResponse.json(data, { status: res.status });
  }

  const res = await lastminutepush().post(`/v1/invoices/${id}/status`, body);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
