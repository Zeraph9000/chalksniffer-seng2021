import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { transitionStatus, setMappingField, isOrderServiceError } from "@/lib/order-service";
import { despatch } from "@/lib/despatch-client";
import { chalksniffer } from "@/lib/chalksniffer-client";
import { buildDespatchAdviceXml } from "@/lib/ubl-despatch-builder";
import { Store, User, UserAddress } from "@/lib/types";
import { ObjectId } from "mongodb";

type UblOrderLine = {
  lineItem: {
    id: string;
    quantity: number;
    unitCode?: string;
    price: { priceAmount: number; currencyID: string };
    item: { name: string; description?: string; sellersItemIdentification?: string };
  };
};

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const client = await clientPromise;
  const db = client.db();

  const auth = await authorizeOrderAccess(db, params.id, null);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.role !== "seller") return NextResponse.json({ error: "FORBIDDEN", message: "sellers only" }, { status: 403 });
  const mapping = auth.mapping;

  if (mapping.status !== "paid") {
    return NextResponse.json({ error: "INVALID_STATE", message: `cannot despatch from ${mapping.status}` }, { status: 400 });
  }

  // Fetch the UBL order from Chalksniffer to get real line items
  const ubl = await chalksniffer.getOrder(params.id);
  if (!ubl || typeof ubl !== "object" || !("orderLines" in ubl)) {
    return NextResponse.json({ error: "UPSTREAM_UNAVAILABLE", message: "could not fetch UBL order" }, { status: 502 });
  }
  const ublOrder = ubl as unknown as { id?: string; issueDate?: string; orderLines: UblOrderLine[] };

  // Resolve the store + seller for the despatch-supplier-party block
  const store = await db.collection<Store>("stores").findOne({ storeId: mapping.storeId });
  if (!store) return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 500 });

  let sellerObjectId: ObjectId;
  try { sellerObjectId = new ObjectId(store.userId); }
  catch { return NextResponse.json({ error: "SELLER_NOT_FOUND" }, { status: 500 }); }
  const seller = await db.collection<User>("users").findOne({ _id: sellerObjectId });
  if (!seller) return NextResponse.json({ error: "SELLER_NOT_FOUND" }, { status: 500 });

  // Build real UBL Despatch Advice XML
  const xml = buildDespatchAdviceXml({
    orderId: params.id,
    issueDate: new Date().toISOString().split("T")[0],
    ublOrder,
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
  if (!r.ok) return NextResponse.json({ error: "DESPATCH_API_FAILED", status: r.status }, { status: 503 });

  await setMappingField(db, params.id, { despatchDocumentId: r.uuid });
  const t = await transitionStatus(db, params.id, "despatched", auth.userId, `despatch advice ${r.uuid}`);
  if (isOrderServiceError(t)) return NextResponse.json({ error: t.error, message: t.message }, { status: t.status });

  return NextResponse.json({ status: "despatched", despatchDocumentId: r.uuid });
}
