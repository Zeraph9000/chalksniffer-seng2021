import { auth } from "@/auth";
import clientPromise from "@/lib/db";
import { SessionData, User } from "./types";

export async function getSessionOrNull(): Promise<SessionData | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection<User>("users").findOne({
    email: session.user.email,
  });

  if (!user) return null;

  return {
    role: user.role,
    name: user.name,
    email: user.email,
    userId: user._id!.toString(),
  };
}
