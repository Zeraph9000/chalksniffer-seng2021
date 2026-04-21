import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/db";
import { signIn } from "@/auth";
import { OrderMapping, UserRole } from "@/lib/types";

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
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    let inserted;
    try {
      inserted = await db.collection("users").insertOne({
        name, email, password: hashedPassword, role, companyName, abn, phone, address, createdAt: new Date(),
      });
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && (e as { code?: number }).code === 11000) {
        return NextResponse.json({ error: "EMAIL_TAKEN", message: "email already registered" }, { status: 409 });
      }
      throw e;
    }

    // --- GUEST ORDER CLAIM ---
    // If this new user has placed guest orders with the same email, attach them to the account.
    // $push with a dynamic value per-doc needs per-doc updates, not updateMany.
    const newUserId = inserted.insertedId.toString();
    const orphans = await db
      .collection<OrderMapping>("orderMappings")
      .find({ buyerEmail: email, buyerId: null })
      .toArray();

    let claimedCount = 0;
    for (const o of orphans) {
      try {
        await db.collection<OrderMapping>("orderMappings").updateOne(
          { _id: o._id },
          {
            $set: { buyerId: newUserId, updatedAt: new Date() },
            $push: {
              statusHistory: {
                status: o.status,
                at: new Date(),
                byUserId: newUserId,
                note: "claimed by registration",
              },
            },
          }
        );
        claimedCount++;
      } catch (e) {
        // Claims are best-effort and idempotent (subsequent registration attempts would be 409
        // for the user; but the filter `buyerId: null` makes re-runs safe if we ever build a retry).
        console.warn(`[register] failed to claim order ${o.orderId}: ${String(e)}`);
      }
    }

    await signIn("credentials", { email, password, redirect: false });
    return NextResponse.json({ success: true, role, claimedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
