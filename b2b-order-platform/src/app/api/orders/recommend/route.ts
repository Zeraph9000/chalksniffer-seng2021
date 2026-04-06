import { NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { chalksniffer } from "@/lib/api-clients";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await chalksniffer().get("/order/recommend");
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
