import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { transitionStatus, setMappingField, isOrderServiceError } from "@/lib/order-service";
import { despatch } from "@/lib/despatch-client";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const client = await clientPromise;
  const db = client.db();

  const auth = await authorizeOrderAccess(db, params.id, null);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.role !== "seller") {
    return NextResponse.json({ error: "FORBIDDEN", message: "sellers only" }, { status: 403 });
  }
  const mapping = auth.mapping;

  if (mapping.status !== "paid") {
    return NextResponse.json({ error: "INVALID_STATE", message: `cannot despatch from ${mapping.status}` }, { status: 400 });
  }

  const advice = {
    documentID: params.id,
    senderId: mapping.sellerId,
    receiverId: mapping.buyerEmail,
    copyIndicator: false,
    issueDate: new Date().toISOString().split("T")[0],
    documentStatusCode: "NoStatus",
    orderReference: { id: params.id, issueDate: mapping.issueDate },
    despatchSupplierParty: { party: { name: mapping.sellerId, postalAddress: { streetName: "", cityName: "", postalZone: "", countryIdentificationCode: "AU" } } },
    // TODO(devex-integration): normalize to ISO-3166 alpha-2; UserAddress.country is free-form today.
    deliveryCustomerParty: { party: { name: mapping.buyerName, postalAddress: { ...mapping.buyerAddress, countryIdentificationCode: mapping.buyerAddress.country } } },
    shipment: {
      id: params.id, consignmentId: params.id,
      delivery: {
        deliveryAddress: { ...mapping.buyerAddress, countryIdentificationCode: mapping.buyerAddress.country },
        requestedDeliveryPeriod: { startDate: mapping.issueDate, endDate: mapping.issueDate },
      },
    },
    // TODO(devex-integration): populate despatchLines from the Chalksniffer order's line items
    //   before hitting the real DevEx API. Empty array works for the sprint demo with MOCK_EXTERNAL=1.
    despatchLines: [],
  };

  const r = await despatch.createDespatchAdvice(advice as unknown as Record<string, unknown>);
  if (!r.ok) return NextResponse.json({ error: "DESPATCH_API_FAILED", status: r.status }, { status: 503 });

  await setMappingField(db, params.id, { despatchDocumentId: r.uuid });
  const t = await transitionStatus(db, params.id, "despatched", auth.userId, `despatch doc ${r.uuid}`);
  if (isOrderServiceError(t)) return NextResponse.json({ error: t.error, message: t.message }, { status: t.status });

  return NextResponse.json({ status: "despatched", despatchDocumentId: r.uuid });
}
