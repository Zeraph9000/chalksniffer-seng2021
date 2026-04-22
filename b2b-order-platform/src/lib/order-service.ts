import { Db } from "mongodb";
import { OrderLineSnapshot, OrderMapping, OrderStatus, StatusEvent, UserAddress } from "./types";
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
  stripePaymentIntentId?: string;
  guestAccessToken?: string;
  lines?: OrderLineSnapshot[];
};

export async function createMapping(
  db: Db, input: CreateMappingInput,
): Promise<OrderMapping | OrderServiceError> {
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
    lines: input.lines,
    stripePaymentIntentId: input.stripePaymentIntentId,
    guestAccessToken: input.guestAccessToken,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.collection<OrderMapping>("orderMappings").insertOne(mapping);
    return mapping;
  } catch (e: unknown) {
    // Mongo error code 11000 = duplicate key — occurs if a unique index on orderId
    // is defined and the caller retried with the same id.
    if (typeof e === "object" && e !== null && (e as { code?: number }).code === 11000) {
      return err("DUPLICATE_ORDER", `order ${input.orderId} already exists`, 409);
    }
    throw e;
  }
}

export async function getMapping(db: Db, orderId: string): Promise<OrderMapping | null> {
  return db.collection<OrderMapping>("orderMappings").findOne({ orderId });
}

/**
 * Transition a mapping to a new status, guarded by the state machine and
 * a DB-level CAS (only the mapping still in `from` is updated; concurrent
 * changes raise CONCURRENT_MODIFICATION).
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
  const updated = await db.collection<OrderMapping>("orderMappings").findOneAndUpdate(
    { orderId, status: mapping.status },
    { $set: { status: to, updatedAt: new Date() }, $push: { statusHistory: event } },
    { returnDocument: "after" },
  );
  if (updated === null) {
    return err("CONCURRENT_MODIFICATION", "order status changed concurrently; retry", 409);
  }
  return updated;
}

/**
 * Patch external-document IDs or the stripe intent on a mapping.
 * Narrowly typed to prevent callers from bypassing the state machine.
 */
export async function setMappingField(
  db: Db, orderId: string,
  fields: Partial<Pick<OrderMapping,
    "despatchDocumentId" | "receiptAdviceId" | "invoiceId" | "stripePaymentIntentId" | "guestAccessToken">>,
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
