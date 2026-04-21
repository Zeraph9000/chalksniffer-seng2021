import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { User } from "@/lib/types";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection<User>("users").findOne({ email: session.email });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profile = { ...user, password: undefined };
  return NextResponse.json({ ...profile, _id: user._id!.toString() });
}

export async function PUT(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, phone, companyName, abn, address, avatarUrl } = body as {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    abn?: string;
    address?: { streetName?: string; cityName?: string; postalZone?: string; country?: string };
    avatarUrl?: string | null;
  };

  const client = await clientPromise;
  const db = client.db();

  // If email is being changed, check uniqueness
  if (email && email !== session.email) {
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
  }

  // Build $set and $unset payloads from provided fields only
  const set: Record<string, unknown> = {};
  const unset: Record<string, string> = {};

  if (name !== undefined) set.name = name;
  if (email !== undefined) set.email = email;
  if (phone !== undefined) set.phone = phone;
  if (companyName !== undefined) set.companyName = companyName;
  if (abn !== undefined) set.abn = abn;
  if (address) {
    if (address.streetName !== undefined) set["address.streetName"] = address.streetName;
    if (address.cityName !== undefined) set["address.cityName"] = address.cityName;
    if (address.postalZone !== undefined) set["address.postalZone"] = address.postalZone;
    if (address.country !== undefined) set["address.country"] = address.country;
  }
  if (avatarUrl !== undefined) {
    if (avatarUrl === null) unset.avatarUrl = "";
    else set.avatarUrl = avatarUrl;
  }

  if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const writeOps: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) writeOps.$set = set;
  if (Object.keys(unset).length > 0) writeOps.$unset = unset;

  await db.collection("users").updateOne({ email: session.email }, writeOps);

  const updatedUser = await db.collection<User>("users").findOne({
    email: email || session.email,
  });

  if (!updatedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profile = { ...updatedUser, password: undefined };
  return NextResponse.json({ ...profile, _id: updatedUser._id!.toString() });
}
