import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db();

  const existing = await db.collection("products").findOne({ _id: new ObjectId(id) });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (existing.sellerEmail !== session.email) return NextResponse.json({ error: "Not your product" }, { status: 403 });

  const { name, description, category, unitCode, unitPrice, currency, stock } = body;
  await db.collection("products").updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, description, category, unitCode, unitPrice: Number(unitPrice), currency, stock: Number(stock) } }
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const { id } = await params;
  const client = await clientPromise;
  const db = client.db();

  const existing = await db.collection("products").findOne({ _id: new ObjectId(id) });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (existing.sellerEmail !== session.email) return NextResponse.json({ error: "Not your product" }, { status: 403 });

  await db.collection("products").deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
