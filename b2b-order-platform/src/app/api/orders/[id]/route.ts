import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { chalksniffer } from "@/lib/chalksniffer-client";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.nextUrl.searchParams.get("t");
  const client = await clientPromise;
  const db = client.db();

  const auth = await authorizeOrderAccess(db, params.id, token);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const ubl = await chalksniffer.getOrder(params.id);
  return NextResponse.json({ mapping: auth.mapping, role: auth.role, order: ubl });
}
