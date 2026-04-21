import { auth as sellerAuth } from "@/auth.seller";
import clientPromise from "./db";
import type { SessionData, User } from "./types";

export async function getSellerSessionOrNull(): Promise<SessionData | null> {
  const session = await sellerAuth();
  if (!session?.user?.email) return null;
  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection<User>("users").findOne({ email: session.user.email });
  if (!user || user.role !== "seller") return null;
  return {
    role: user.role,
    name: user.name,
    email: user.email,
    userId: user._id!.toString(),
  };
}
