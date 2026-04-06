import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/db";
import { signIn } from "@/auth";
import { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body as {
    email: string;
    password: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // 1. Look up user and verify password
    const user = await db.collection<User>("users").findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2. Create Auth.js session (this also refreshes the Despatch session
    // inside the authorize callback using stored Despatch credentials)
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return NextResponse.json({ success: true, role: user.role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
