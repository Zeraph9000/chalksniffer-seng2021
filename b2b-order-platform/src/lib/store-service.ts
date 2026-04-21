import crypto from "crypto";
import { Db } from "mongodb";
import { Store, StoreCreateRequest, StoreStatus, StoreUpdateRequest } from "./types";
import { generateUniqueSlug, isReservedSlug, isValidSlugFormat, slugify } from "./slug";

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

let slugIndexEnsured = false;
async function ensureSlugIndex(db: Db) {
  if (slugIndexEnsured) return;
  await db.collection<Store>("stores").createIndex({ slug: 1 }, { unique: true, sparse: true });
  slugIndexEnsured = true;
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

  await ensureSlugIndex(db);
  const base = slugify(body.storeName!);
  const slug = await generateUniqueSlug(base, db);

  const now = new Date();
  const store: Store = {
    storeId: crypto.randomUUID(),
    userId,
    slug,
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
  const updates: Partial<Store> & { updatedAt: Date } = { updatedAt: now };
  for (const field of ["storeName", "description", "logoUrl", "bannerUrl", "location", "category"] as const) {
    if (body[field] !== undefined) {
      (updates as unknown as Record<string, string>)[field] = body[field]!.trim();
    }
  }
  if (body.status !== undefined) updates.status = body.status;

  if (body.slug !== undefined) {
    const requested = body.slug.trim();
    if (!isValidSlugFormat(requested)) {
      return serviceError("INVALID_SLUG", "Slug must be lowercase with hyphens, 2-64 chars", 400);
    }
    if (isReservedSlug(requested)) {
      return serviceError("INVALID_SLUG", "Slug is reserved", 400);
    }
    if (requested !== existingStore.slug) {
      await ensureSlugIndex(db);
      const taken = await db.collection<Store>("stores").findOne({ slug: requested });
      if (taken) return serviceError("CONFLICT", "Slug already in use", 409);
      updates.slug = requested;
    }
  }

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

export async function getStoreBySlug(db: Db, slug: string): Promise<Store | null> {
  await ensureSlugIndex(db);
  return db.collection<Store>("stores").findOne({ slug });
}

export async function listActiveStores(db: Db, limit = 12): Promise<Store[]> {
  await ensureSlugIndex(db);
  return db
    .collection<Store>("stores")
    .find({ status: { $ne: "closed" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function backfillSlugIfMissing(db: Db, store: Store): Promise<Store> {
  if (store.slug) return store;
  await ensureSlugIndex(db);
  const slug = await generateUniqueSlug(slugify(store.storeName), db);
  await db.collection<Store>("stores").updateOne({ storeId: store.storeId }, { $set: { slug } });
  return { ...store, slug };
}
