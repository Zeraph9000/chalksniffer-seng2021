import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { getMapping, transitionStatus, setMappingField, isOrderServiceError } from "@/lib/order-service";
import { despatch } from "@/lib/despatch-client";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionOrNull();
  if (!session || session.role !== "seller") {
    return NextResponse.json({ error: "FORBIDDEN", message: "sellers only" }, { status: 403 });
  }
  const client = await clientPromise;
  const db = client.db();

  const mapping = await getMapping(db, params.id);
  if (!mapping || mapping.sellerId !== session.userId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
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
    deliveryCustomerParty: { party: { name: mapping.buyerName, postalAddress: { ...mapping.buyerAddress, countryIdentificationCode: mapping.buyerAddress.country } } },
    shipment: {
      id: params.id, consignmentId: params.id,
      delivery: {
        deliveryAddress: { ...mapping.buyerAddress, countryIdentificationCode: mapping.buyerAddress.country },
        requestedDeliveryPeriod: { startDate: mapping.issueDate, endDate: mapping.issueDate },
      },
    },
    despatchLines: [],
  };

  const r = await despatch.createDespatchAdvice(advice as unknown as Record<string, unknown>);
  if (!r.ok) return NextResponse.json({ error: "DESPATCH_API_FAILED", status: r.status }, { status: 503 });

  await setMappingField(db, params.id, { despatchDocumentId: r.uuid });
  const t = await transitionStatus(db, params.id, "despatched", session.userId, `despatch doc ${r.uuid}`);
  if (isOrderServiceError(t)) return NextResponse.json({ error: t.error, message: t.message }, { status: t.status });

  return NextResponse.json({ status: "despatched", despatchDocumentId: r.uuid });
}
