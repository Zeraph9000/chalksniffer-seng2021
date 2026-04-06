import clientPromise from "@/lib/db";
import { OrderMapping } from "./types";

const COLLECTION = "orderMappings";

export async function getMapping(orderId: string): Promise<OrderMapping | null> {
  const client = await clientPromise;
  const db = client.db();
  return db.collection<OrderMapping>(COLLECTION).findOne({ orderId });
}

export async function setMapping(
  orderId: string,
  update: Partial<OrderMapping>
): Promise<OrderMapping> {
  const client = await clientPromise;
  const db = client.db();

  const existing = await db.collection<OrderMapping>(COLLECTION).findOne({ orderId });

  const mapping: OrderMapping = {
    orderId,
    buyerEmail: update.buyerEmail ?? existing?.buyerEmail ?? "",
    sellerEmail: update.sellerEmail ?? existing?.sellerEmail ?? "",
    status: "placed",
    buyerStatus: update.buyerStatus ?? existing?.buyerStatus ?? "under_review",
    sellerStatus: update.sellerStatus ?? existing?.sellerStatus ?? "needs_review",
    createdAt: existing?.createdAt ?? new Date(),
    ...existing,
    ...update,
  } as OrderMapping;

  // Derive status from linked documents (don't override "paid")
  if (update.status === "paid" || existing?.status === "paid") {
    mapping.status = "paid";
  } else if (mapping.invoiceId) {
    mapping.status = "invoiced";
  } else if (mapping.receiptAdviceId) {
    mapping.status = "received";
  } else if (mapping.despatchDocumentId) {
    mapping.status = "despatched";
  } else {
    mapping.status = "placed";
  }

  if (!existing) {
    mapping.createdAt = new Date();
    await db.collection<OrderMapping>(COLLECTION).insertOne(mapping);
  } else {
    await db.collection(COLLECTION).updateOne({ orderId }, { $set: mapping });
  }

  return mapping;
}

export async function getMappingByDespatch(despatchDocumentId: string): Promise<OrderMapping | null> {
  const client = await clientPromise;
  const db = client.db();
  return db.collection<OrderMapping>(COLLECTION).findOne({ despatchDocumentId });
}

export async function getOrderIdsForUser(
  email: string,
  role: string,
  status?: string
): Promise<string[]> {
  const client = await clientPromise;
  const db = client.db();

  const filter: Record<string, string> = role === "buyer"
    ? { buyerEmail: email }
    : { sellerEmail: email };

  if (status) {
    filter.status = status;
  }

  const mappings = await db
    .collection<OrderMapping>(COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return mappings.map((m) => m.orderId);
}

export async function assertOrderAccess(
  email: string,
  role: string,
  orderId: string
): Promise<void> {
  const mapping = await getMapping(orderId);
  if (!mapping) return;

  if (role === "buyer" && mapping.buyerEmail !== email) {
    throw new Error("Access denied");
  }
  if (role === "seller" && mapping.sellerEmail !== email) {
    throw new Error("Access denied");
  }
}

export async function getMappingByInvoice(invoiceId: string): Promise<OrderMapping | null> {
  const client = await clientPromise;
  const db = client.db();
  return db.collection<OrderMapping>(COLLECTION).findOne({ invoiceId });
}

export async function buyerEdited(orderId: string): Promise<void> {
  await setMapping(orderId, { buyerStatus: "under_review", sellerStatus: "needs_review", sellerNote: undefined });
}

export async function requestChange(orderId: string, note: string): Promise<OrderMapping> {
  return setMapping(orderId, { buyerStatus: "needs_review", sellerStatus: "under_review", sellerNote: note });
}
