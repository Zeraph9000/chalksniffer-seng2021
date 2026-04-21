import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { chalksniffer } from "@/lib/chalksniffer-client";

export async function GET(_req: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const result = await chalksniffer.getRecommend();
  if (!result) return NextResponse.json({ error: "NO_RECOMMENDATION" }, { status: 404 });
  return NextResponse.json(result);
}
