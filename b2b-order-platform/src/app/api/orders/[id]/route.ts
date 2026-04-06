import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { chalksniffer } from "@/lib/api-clients";
import { assertOrderAccess } from "@/lib/order-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await assertOrderAccess(session.email, session.role, id);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const res = await chalksniffer().get(`/orders/${id}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await assertOrderAccess(session.email, session.role, id);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  const res = await chalksniffer().put(`/orders/${id}`, body);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await assertOrderAccess(session.email, session.role, id);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const res = await chalksniffer().delete(`/orders/${id}`);
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
