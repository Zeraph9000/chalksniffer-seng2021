import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { transitionStatus, setMappingField, isOrderServiceError } from "@/lib/order-service";
import { despatch } from "@/lib/despatch-client";
import { chalksniffer } from "@/lib/chalksniffer-client";

/**
 * Seller marks the order as despatched.
 *
 * DevEx Despatch V2's /api/v1/despatch/create expects raw UBL Order XML (not
 * Despatch Advice) — it generates the despatch-advice server-side. So we fetch
 * the canonical Order XML from Chalksniffer and forward it unchanged.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const client = await clientPromise;
  const db = client.db();

  const auth = await authorizeOrderAccess(db, params.id, null);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.role !== "seller") {
    return NextResponse.json({ error: "FORBIDDEN", message: "sellers only" }, { status: 403 });
  }
  const mapping = auth.mapping;

  if (mapping.status !== "paid") {
    return NextResponse.json(
      { error: "INVALID_STATE", message: `cannot despatch from ${mapping.status}` },
      { status: 400 },
    );
  }

  const xml = await chalksniffer.getOrderXml(params.id);
  if (xml === null) {
    return NextResponse.json(
      { error: "UPSTREAM_UNAVAILABLE", message: "could not fetch order XML from Chalksniffer" },
      { status: 502 },
    );
  }

  const r = await despatch.createDespatchAdvice(xml);
  if (!r.ok) {
    return NextResponse.json(
      { error: "DESPATCH_API_FAILED", message: r.message ?? "DevEx rejected the despatch request", status: r.status },
      { status: 503 },
    );
  }

  await setMappingField(db, params.id, { despatchDocumentId: r.uuid });
  const t = await transitionStatus(db, params.id, "despatched", auth.userId, `despatch advice ${r.uuid}`);
  if (isOrderServiceError(t)) {
    return NextResponse.json({ error: t.error, message: t.message }, { status: t.status });
  }

  return NextResponse.json({ status: "despatched", despatchDocumentId: r.uuid });
}
