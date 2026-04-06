import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { lastminutepush } from "@/lib/api-clients";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const res = await lastminutepush().post(`/v1/invoices/${id}/clone`, body);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
