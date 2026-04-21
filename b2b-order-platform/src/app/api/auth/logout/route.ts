import { NextRequest, NextResponse } from "next/server";
import { signOut as buyerSignOut } from "@/auth.buyer";
import { signOut as sellerSignOut } from "@/auth.seller";

export async function POST(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role") === "seller" ? "seller" : "buyer";
  const signOut = role === "seller" ? sellerSignOut : buyerSignOut;
  await signOut({ redirect: false });
  return NextResponse.json({ success: true });
}
