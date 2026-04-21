import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { createStore, isStoreServiceError } from "@/lib/store-service";
import { Store } from "@/lib/types";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();

  const stores = await db
    .collection<Store>("stores")
    .find({ status: { $ne: "closed" } })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(stores);
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const client = await clientPromise;
  const db = client.db();
  const result = await createStore(db, session.userId, await request.json());

  if (isStoreServiceError(result)) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }

  return NextResponse.json(result, { status: 201 });
}
