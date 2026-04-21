import { NextRequest, NextResponse } from "next/server";
import { auth as buyerAuth } from "@/auth.buyer";
import { auth as sellerAuth } from "@/auth.seller";
import clientPromise from "@/lib/db";
import { User } from "@/lib/types";

export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role") === "seller" ? "seller" : "buyer";
  const auth = role === "seller" ? sellerAuth : buyerAuth;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection<User>("users").findOne({ email: session.user.email });
  if (!user || user.role !== role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    role: user.role,
    name: user.name,
    email: user.email,
    companyName: user.companyName,
    abn: user.abn,
    phone: user.phone,
    address: user.address,
  });
}
