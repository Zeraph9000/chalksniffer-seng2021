import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/db";
import { signIn as buyerSignIn } from "@/auth.buyer";
import { signIn as sellerSignIn } from "@/auth.seller";
import { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role") === "seller" ? "seller" : "buyer";
  const signIn = role === "seller" ? sellerSignIn : buyerSignIn;

  const body = await request.json();
  const { email, password } = body as { email: string; password: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection<User>("users").findOne({ email });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Refuse cross-role logins (buyer endpoint must not authenticate a seller, and vice versa).
    if (user.role !== role) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await signIn("credentials", { email, password, redirect: false });
    return NextResponse.json({ success: true, role: user.role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
