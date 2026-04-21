import { Db } from "mongodb";
import { OrderMapping, OrderStatus, StatusEvent, UserAddress } from "./types";
import { canTransition } from "./state-machine";

export type OrderServiceError = { error: string; message: string; status: number };

export function isOrderServiceError(x: unknown): x is OrderServiceError {
  return (
    typeof x === "object" && x !== null
    && "error" in x && typeof (x as { error: unknown }).error === "string"
    && "status" in x && typeof (x as { status: unknown }).status === "number"
    && "message" in x && typeof (x as { message: unknown }).message === "string"
  );
}

function err(error: string, message: string, status: number): OrderServiceError {
  return { error, message, status };
}

export type CreateMappingInput = {
  orderId: string;
  storeId: string;
  sellerId: string;
  buyerId: string | null;
  buyerEmail: string;
  buyerName: string;
  buyerAddress: UserAddress;
  buyerPhone: string;
  note?: string;
  payableAmount: number;
  documentCurrencyCode: string;
  issueDate: string;
  guestAccessToken?: string;
};

export async function createMapping(db: Db, input: CreateMappingInput): Promise<OrderMapping> {
  const now = new Date();
  const mapping: OrderMapping = {
    orderId: input.orderId,
    storeId: input.storeId,
    sellerId: input.sellerId,
    buyerId: input.buyerId,
    buyerEmail: input.buyerEmail,
    buyerName: input.buyerName,
    buyerAddress: input.buyerAddress,
    buyerPhone: input.buyerPhone,
    note: input.note,
    status: "placed",
    statusHistory: [{ status: "placed", at: now, byUserId: input.buyerId }],
    payableAmount: input.payableAmount,
    documentCurrencyCode: input.documentCurrencyCode,
    issueDate: input.issueDate,
    guestAccessToken: input.guestAccessToken,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<OrderMapping>("orderMappings").insertOne(mapping);
  return mapping;
}

export async function getMapping(db: Db, orderId: string): Promise<OrderMapping | null> {
  return db.collection<OrderMapping>("orderMappings").findOne({ orderId });
}

/**
 * Transition a mapping to a new status, guarded by the state machine and
 * a DB-level race check (only the mapping still in `from` will be updated).
 */
export async function transitionStatus(
  db: Db, orderId: string, to: OrderStatus,
  byUserId: string | null, note?: string,
): Promise<OrderMapping | OrderServiceError> {
  const mapping = await getMapping(db, orderId);
  if (!mapping) return err("NOT_FOUND", "order not found", 404);
  if (!canTransition(mapping.status, to)) {
    return err("INVALID_TRANSITION", `cannot go ${mapping.status} → ${to}`, 400);
  }
  const event: StatusEvent = { status: to, at: new Date(), byUserId, note };
  await db.collection<OrderMapping>("orderMappings").updateOne(
    { orderId, status: mapping.status },    // guard against races
    { $set: { status: to, updatedAt: new Date() }, $push: { statusHistory: event } },
  );
  return { ...mapping, status: to, statusHistory: [...mapping.statusHistory, event] };
}

/** Patch specific fields on a mapping (e.g. despatchDocumentId, invoiceId). */
export async function setMappingField(
  db: Db, orderId: string, fields: Partial<OrderMapping>,
): Promise<void> {
  await db.collection<OrderMapping>("orderMappings").updateOne(
    { orderId },
    { $set: { ...fields, updatedAt: new Date() } },
  );
}

export async function listMappingsForStore(db: Db, storeId: string): Promise<OrderMapping[]> {
  return db.collection<OrderMapping>("orderMappings").find({ storeId }).sort({ createdAt: -1 }).toArray();
}

export async function listMappingsForBuyer(db: Db, buyerId: string): Promise<OrderMapping[]> {
  return db.collection<OrderMapping>("orderMappings").find({ buyerId }).sort({ createdAt: -1 }).toArray();
}
