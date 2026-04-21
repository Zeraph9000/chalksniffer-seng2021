import crypto from "crypto";
import { Db } from "mongodb";
import { Store, StoreCreateRequest, StoreStatus, StoreUpdateRequest } from "./types";

export const STORE_STATUSES: StoreStatus[] = ["active", "paused", "closed"];

type StoreServiceError = {
  error: string;
  message: string;
  status: number;
};

type ValidationResult = {
  valid: boolean;
  errors: { field: string; message: string }[];
};

function serviceError(error: string, message: string, status: number): StoreServiceError {
  return { error, message, status };
}

export function isStoreStatus(value: unknown): value is StoreStatus {
  return typeof value === "string" && STORE_STATUSES.includes(value as StoreStatus);
}

export function validateStorePayload(body: StoreCreateRequest, partial = false): ValidationResult {
  const errors: ValidationResult["errors"] = [];

  if (!partial || body.storeName !== undefined) {
    if (!body.storeName || body.storeName.trim() === "") {
      errors.push({ field: "storeName", message: "required" });
    }
  }

  if (!partial || body.description !== undefined) {
    if (!body.description || body.description.trim() === "") {
      errors.push({ field: "description", message: "required" });
    }
  }

  if (!partial || body.status !== undefined) {
    if (!body.status) {
      errors.push({ field: "status", message: "required" });
    } else if (!isStoreStatus(body.status)) {
      errors.push({ field: "status", message: "must be one of: active, paused, closed" });
    }
  }

  for (const field of ["logoUrl", "bannerUrl", "location", "category"] as const) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      errors.push({ field, message: "must be a string" });
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function createStore(
  db: Db,
  userId: string,
  body: StoreCreateRequest
): Promise<Store | StoreServiceError> {
  const validation = validateStorePayload(body);
  if (!validation.valid) {
    return serviceError("INVALID_STORE_BODY", "Invalid request body / missing required fields", 400);
  }

  const existingStore = await db.collection<Store>("stores").findOne({ userId });
  if (existingStore) {
    return serviceError("CONFLICT", "Store already exists for this seller", 409);
  }

  const now = new Date();
  const store: Store = {
    storeId: crypto.randomUUID(),
    userId,
    storeName: body.storeName!.trim(),
    description: body.description!.trim(),
    logoUrl: body.logoUrl,
    bannerUrl: body.bannerUrl,
    location: body.location,
    category: body.category,
    status: body.status!,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<Store>("stores").insertOne(store);
  return store;
}

export async function updateStore(
  db: Db,
  userId: string,
  storeId: string,
  body: StoreUpdateRequest
): Promise<Store | StoreServiceError> {
  const existingStore = await db.collection<Store>("stores").findOne({ storeId });
  if (!existingStore) {
    return serviceError("Not Found", "Store does not exist", 404);
  }

  if (existingStore.userId !== userId) {
    return serviceError("FORBIDDEN", "This store does not belong to you", 403);
  }

  const validation = validateStorePayload(body, true);
  if (!validation.valid) {
    return serviceError("INVALID_STORE_BODY", "Invalid request body", 400);
  }

  const now = new Date();
  const updates: StoreUpdateRequest & { updatedAt: Date } = { updatedAt: now };
  for (const field of ["storeName", "description", "logoUrl", "bannerUrl", "location", "category"] as const) {
    if (body[field] !== undefined) {
      updates[field] = body[field].trim();
    }
  }
  if (body.status !== undefined) updates.status = body.status;

  await db.collection<Store>("stores").updateOne({ storeId }, { $set: updates });

  return {
    ...existingStore,
    ...updates,
  };
}

export async function updateStoreStatus(
  db: Db,
  userId: string,
  storeId: string,
  status: unknown
): Promise<Store | StoreServiceError> {
  if (!isStoreStatus(status)) {
    return serviceError("Bad Request", "Invalid status value", 400);
  }

  return updateStore(db, userId, storeId, { status });
}

export function isStoreServiceError(result: Store | StoreServiceError): result is StoreServiceError {
  return "error" in result && "status" in result;
}
