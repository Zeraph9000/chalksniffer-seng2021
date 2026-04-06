import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { increment } = body as { increment: number };

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection("products").findOneAndUpdate(
    { _id: new ObjectId(id), stock: { $gte: increment > 0 ? 0 : -increment } },
    { $inc: { stock: increment } },
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ error: "Insufficient stock or product not found" }, { status: 400 });
  }

  return NextResponse.json({ stock: result.stock });
}
