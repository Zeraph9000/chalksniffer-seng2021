import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/db";
import { signIn } from "@/auth";
import { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password, role } = body as {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  };

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!["buyer", "seller"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // 1. Check if email already exists
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 2. Hash password first — the hash is also used as the Despatch API password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Provision external service credentials
    const chalkRes = await fetch(
      `${process.env.CHALKSNIFFER_API_URL}/auth/register`,
      { method: "POST" }
    );
    if (!chalkRes.ok) throw new Error("Chalksniffer registration failed");
    const chalkData = await chalkRes.json();

    await fetch(`${process.env.DESPATCH_API_URL}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, email, password: hashedPassword }),
    });

    const despatchSessionRes = await fetch(
      `${process.env.DESPATCH_API_URL}/sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password: hashedPassword }),
      }
    );
    if (!despatchSessionRes.ok)
      throw new Error("Despatch session creation failed");

    const lmpRes = await fetch(
      `${process.env.LASTMINUTEPUSH_API_URL}/v1/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: email }),
      }
    );
    if (!lmpRes.ok) throw new Error("LastMinutePush registration failed");
    const lmpData = await lmpRes.json();

    // 4. Create user with hashed password and Despatch credentials
    await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role,
      chalksniffer: { apiKey: chalkData.apiKey },
      despatch: { email, password: hashedPassword },
      lastminutepush: { apiKey: lmpData.apiKey },
      createdAt: new Date(),
    });

    // 5. Create Auth.js session
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
