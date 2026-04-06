import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/db";
import { signIn } from "@/auth";
import { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password, role, companyName, abn, phone, address } = body as {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    companyName: string;
    abn: string;
    phone: string;
    address: { streetName: string; cityName: string; postalZone: string; country: string };
  };

  if (!name || !email || !password || !role || !companyName || !abn || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["buyer", "seller"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!address?.streetName || !address?.cityName || !address?.postalZone || !address?.country) {
    return NextResponse.json({ error: "Complete address is required" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection("users").insertOne({
      name, email, password: hashedPassword, role, companyName, abn, phone, address, createdAt: new Date(),
    });
    await signIn("credentials", { email, password, redirect: false });
    return NextResponse.json({ success: true, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
