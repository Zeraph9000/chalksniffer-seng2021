import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { Store } from "@/lib/types";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ userId: session.userId });

  if (!store) {
    return NextResponse.json({ error: "Not Found", message: "You don't own a store" }, { status: 404 });
  }

  return NextResponse.json(store);
}
