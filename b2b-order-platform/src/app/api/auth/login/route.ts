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

    // 2. Refresh external service credentials
    const chalkRes = await fetch(
      `${process.env.CHALKSNIFFER_API_URL}/auth/register`,
      { method: "POST" }
    );
    if (!chalkRes.ok) throw new Error("Failed to connect to order service");
    const chalkData = await chalkRes.json();

    const despatchSessionRes = await fetch(
      `${process.env.DESPATCH_API_URL}/sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      }
    );
    if (!despatchSessionRes.ok) throw new Error("Invalid credentials");
    const despatchSession = await despatchSessionRes.json();

    const lmpRes = await fetch(
      `${process.env.LASTMINUTEPUSH_API_URL}/v1/auth/register-demo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    if (!lmpRes.ok) throw new Error("Failed to connect to invoice service");
    const lmpData = await lmpRes.json();

    // 3. Update user document with refreshed credentials
    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          chalksniffer: { apiKey: chalkData.apiKey },
          despatch: {
            sessionId: despatchSession.sessionId,
            clientId: despatchSession.clientId,
          },
          lastminutepush: { apiKey: lmpData.apiKey },
        },
      }
    );

    // 4. Create Auth.js session via signIn
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
