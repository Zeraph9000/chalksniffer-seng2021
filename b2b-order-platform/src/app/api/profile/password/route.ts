import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { User } from "@/lib/types";

export async function PUT(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword, confirmNewPassword } = body as {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  };

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return NextResponse.json({ error: "All password fields are required" }, { status: 400 });
  }

  if (newPassword !== confirmNewPassword) {
    return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection<User>("users").findOne({ email: session.email });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.collection("users").updateOne(
    { email: session.email },
    { $set: { password: hashedPassword } }
  );

  return NextResponse.json({ message: "Password updated successfully" });
}
