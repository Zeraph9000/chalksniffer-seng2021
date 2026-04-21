import { auth as buyerAuth } from "@/auth.buyer";
import clientPromise from "./db";
import type { SessionData, User, UserAddress } from "./types";

export async function getBuyerSessionOrNull(): Promise<SessionData | null> {
  const session = await buyerAuth();
  if (!session?.user?.email) return null;
  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection<User>("users").findOne({ email: session.user.email });
  if (!user || user.role !== "buyer") return null;
  return {
    role: user.role,
    name: user.name,
    email: user.email,
    userId: user._id!.toString(),
  };
}

export type BuyerProfile = {
  name: string;
  email: string;
  phone: string;
  address: UserAddress;
  companyName?: string;
  abn?: string;
};

export async function getBuyerProfile(): Promise<BuyerProfile | null> {
  const session = await getBuyerSessionOrNull();
  if (!session) return null;
  const client = await clientPromise;
  const user = await client.db().collection<User>("users").findOne({ email: session.email });
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    companyName: user.companyName,
    abn: user.abn,
  };
}
