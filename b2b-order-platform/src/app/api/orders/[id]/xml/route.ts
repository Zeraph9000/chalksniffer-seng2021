import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { chalksniffer } from "@/lib/chalksniffer-client";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.nextUrl.searchParams.get("t");
  const client = await clientPromise;
  const db = client.db();

  const auth = await authorizeOrderAccess(db, params.id, token);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const xml = await chalksniffer.getOrderXml(params.id);
  if (xml === null) {
    return NextResponse.json({ error: "UPSTREAM_UNAVAILABLE", message: "could not fetch order XML" }, { status: 502 });
  }

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="order-${params.id}.xml"`,
    },
  });
}
