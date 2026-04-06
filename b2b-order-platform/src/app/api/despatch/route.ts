import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { despatch } from "@/lib/api-clients";
import { setMapping } from "@/lib/order-access";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await despatch(session).get("/despatch-advices");
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const res = await despatch(session).post("/despatch-advices", body);
  const data = await res.json();

  if (res.ok && body.orderReference?.id) {
    await setMapping(body.orderReference.id, { despatchDocumentId: data.documentId || body.documentID });
  }

  return NextResponse.json(data, { status: res.status });
}
