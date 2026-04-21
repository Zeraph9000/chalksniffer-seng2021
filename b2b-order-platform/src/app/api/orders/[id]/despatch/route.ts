import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { transitionStatus, setMappingField, isOrderServiceError } from "@/lib/order-service";
import { despatch } from "@/lib/despatch-client";
import { chalksniffer } from "@/lib/chalksniffer-client";
import { buildUblOrderXml, UblOrderJson } from "@/lib/ubl-order-builder";
import { Store, User, UserAddress } from "@/lib/types";
import { ObjectId } from "mongodb";

/**
 * Seller marks the order as despatched.
 *
 * DevEx Despatch V2's /api/v1/despatch/create expects raw UBL Order XML (not
 * Despatch Advice) — it generates the advice server-side. We can't forward
 * Chalksniffer's XML as-is because it omits the UBL namespace prefixes
 * (<ID> instead of <cbc:ID>), so we build a spec-conformant Order XML here
 * from the Chalksniffer JSON view and our own store/seller context.
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

  const order = await chalksniffer.getOrder(params.id);
  if (!order || typeof order !== "object" || !("orderLines" in order)) {
    return NextResponse.json(
      { error: "UPSTREAM_UNAVAILABLE", message: "could not fetch order from Chalksniffer" },
      { status: 502 },
    );
  }

  const store = await db.collection<Store>("stores").findOne({ storeId: mapping.storeId });
  if (!store) return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 500 });

  let sellerObjectId: ObjectId;
  try { sellerObjectId = new ObjectId(store.userId); }
  catch { return NextResponse.json({ error: "SELLER_NOT_FOUND" }, { status: 500 }); }
  const seller = await db.collection<User>("users").findOne({ _id: sellerObjectId });
  if (!seller) return NextResponse.json({ error: "SELLER_NOT_FOUND" }, { status: 500 });

  const xml = buildUblOrderXml({
    orderId: params.id,
    issueDate: new Date().toISOString().split("T")[0],
    order: order as unknown as UblOrderJson,
    buyer: {
      buyerName: mapping.buyerName,
      buyerEmail: mapping.buyerEmail,
      buyerPhone: mapping.buyerPhone,
      buyerAddress: mapping.buyerAddress as UserAddress,
    },
    seller: {
      sellerCompanyName: seller.companyName ?? store.storeName,
      sellerAbn: seller.abn ?? undefined,
      sellerAddress: seller.address,
    },
  });

  const r = await despatch.createDespatchAdvice(xml);
  if (!r.ok) {
    return NextResponse.json(
      { error: "DESPATCH_API_FAILED", message: r.message ?? "DevEx rejected the request", status: r.status },
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
