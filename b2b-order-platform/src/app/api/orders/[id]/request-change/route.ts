import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { assertOrderAccess, getMapping, requestChange } from "@/lib/order-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role !== "seller") {
    return NextResponse.json({ error: "Only sellers can request changes" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await assertOrderAccess(session.email, session.role, id);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const mapping = await getMapping(id);
  if (!mapping || mapping.status !== "placed") {
    return NextResponse.json({ error: "Cannot request changes for this order" }, { status: 400 });
  }

  const body = await request.json();
  const { note } = body as { note: string };

  if (!note) {
    return NextResponse.json({ error: "Note is required" }, { status: 400 });
  }

  const updated = await requestChange(id, note);
  return NextResponse.json(updated);
}
