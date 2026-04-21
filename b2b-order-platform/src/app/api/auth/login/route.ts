import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { encode } from "@auth/core/jwt";
import clientPromise from "@/lib/db";
import { User } from "@/lib/types";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — matches NextAuth default session lifetime

export async function POST(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role") === "seller" ? "seller" : "buyer";
  const cookieName = role === "seller" ? "chalk.seller" : "chalk.buyer";

  const body = await request.json();
  const { email, password } = body as { email: string; password: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection<User>("users").findOne({ email });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Refuse cross-role logins.
    if (user.role !== role) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await encode({
      token: {
        sub: user._id!.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      secret,
      salt: cookieName,
      maxAge: MAX_AGE_SECONDS,
    });

    const res = NextResponse.json({ success: true, role: user.role });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE_SECONDS,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
