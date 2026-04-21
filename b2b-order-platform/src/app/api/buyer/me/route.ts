import { NextResponse } from "next/server";
import { getBuyerProfile } from "@/lib/buyer-session";

export async function GET() {
  const profile = await getBuyerProfile();
  if (!profile) return NextResponse.json(null, { status: 200 });
  return NextResponse.json(profile);
}
