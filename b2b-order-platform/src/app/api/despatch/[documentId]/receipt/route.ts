import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { despatch } from "@/lib/api-clients";
import { getMappingByDespatch, setMapping } from "@/lib/order-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = await params;
  const body = await request.json();
  const res = await despatch().post(
    `/despatch-advices/${documentId}/receipt-advices`,
    body
  );
  const data = await res.json();

  if (res.ok) {
    const mapping = await getMappingByDespatch(documentId);
    if (mapping) {
      await setMapping(mapping.orderId, { receiptAdviceId: data.receiptAdviceId });
    }
  }

  return NextResponse.json(data, { status: res.status });
}
