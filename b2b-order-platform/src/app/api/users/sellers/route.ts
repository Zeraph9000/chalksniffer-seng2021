import { NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();
  const sellers = await db
    .collection("users")
    .find({ role: "seller" }, { projection: { name: 1, email: 1, _id: 0 } })
    .toArray();

  return NextResponse.json(sellers);
}
