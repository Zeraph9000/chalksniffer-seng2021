import { NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { User } from "@/lib/types";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection<User>("users").findOne({ email: session.email });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { password, ...profile } = user;
  return NextResponse.json({ ...profile, _id: user._id!.toString() });
}
