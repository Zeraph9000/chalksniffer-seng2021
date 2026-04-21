import crypto from "crypto";
import { Db } from "mongodb";
import {
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductVariant,
  Store,
} from "./types";

export type ProductServiceError = { error: string; message: string; status: number };
export function isProductServiceError(x: unknown): x is ProductServiceError {
  return (
    typeof x === "object" && x !== null
    && "error" in x && typeof (x as { error: unknown }).error === "string"
    && "status" in x && typeof (x as { status: unknown }).status === "number"
    && "message" in x && typeof (x as { message: unknown }).message === "string"
  );
}

function err(error: string, message: string, status: number): ProductServiceError {
  return { error, message, status };
}

function sameOptionValues(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

export type ValidationResult = { valid: boolean; errors: { field: string; message: string }[] };

export function validateProductPayload(body: ProductCreateRequest, partial = false): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  const req = (field: keyof ProductCreateRequest, label?: string) => {
    if (!partial || body[field] !== undefined) {
      const v = body[field] as unknown;
      if (v === undefined || v === null || v === "") {
        errors.push({ field: String(label ?? field), message: "required" });
      }
    }
  };
  req("name");
  req("description");
  req("category");
  req("imageUrl");
  req("unitCode");
  req("currency");

  const options = body.options ?? [];
  if (!partial || body.variants !== undefined) {
    const variants = body.variants ?? [];
    if (variants.length < 1) {
      errors.push({ field: "variants", message: "at least one variant required" });
    }
    const optionNames = options.map((o) => o.name);
    const seenCombos = new Set<string>();
    variants.forEach((v, i) => {
      if (v.price < 0) errors.push({ field: `variants[${i}].price`, message: "must be >= 0" });
      if (v.stock < 0) errors.push({ field: `variants[${i}].stock`, message: "must be >= 0" });
      const keys = Object.keys(v.optionValues);
      if (keys.length !== optionNames.length || !optionNames.every((n) => keys.includes(n))) {
        errors.push({ field: "variants", message: "option keys must match product options" });
        return;
      }
      const combo = optionNames.map((n) => v.optionValues[n]).join("|");
      if (seenCombos.has(combo)) {
        errors.push({ field: "variants", message: `duplicate combo: ${combo}` });
      }
      seenCombos.add(combo);
    });
  }
  return { valid: errors.length === 0, errors };
}

export async function createProduct(
  db: Db,
  userId: string,
  body: ProductCreateRequest
): Promise<Product | ProductServiceError> {
  const validation = validateProductPayload(body);
  if (!validation.valid) {
    return err(
      "INVALID_PRODUCT",
      validation.errors.map((e) => `${e.field}: ${e.message}`).join("; "),
      400
    );
  }

  const store = await db.collection<Store>("stores").findOne({ userId });
  if (!store) return err("FORBIDDEN", "user does not own a store", 403);

  const now = new Date();
  const product: Product = {
    productId: crypto.randomUUID(),
    storeId: store.storeId,
    name: body.name,
    description: body.description,
    category: body.category,
    imageUrl: body.imageUrl,
    unitCode: body.unitCode,
    currency: body.currency,
    available: true,
    options: body.options ?? [],
    variants: (body.variants ?? []).map((v) => ({
      variantId: crypto.randomUUID(),
      optionValues: v.optionValues,
      price: v.price,
      stock: v.stock,
      sku: v.sku,
      imageUrl: v.imageUrl,
    })),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<Product>("products").insertOne(product);
  return product;
}

/**
 * Update a product. Variant identity is preserved across edits:
 *   - If the client sends a variant with a known `variantId`, that ID is honored.
 *   - Otherwise, the existing variant matching by optionValues keeps its ID.
 *   - Otherwise, a new variantId is minted.
 * This prevents breaking external references (carts, orders) when option
 * values or prices are edited.
 */
export async function updateProduct(
  db: Db,
  userId: string,
  productId: string,
  body: ProductUpdateRequest
): Promise<Product | ProductServiceError> {
  const product = await db.collection<Product>("products").findOne({ productId });
  if (!product) return err("NOT_FOUND", "product does not exist", 404);
  const store = await db.collection<Store>("stores").findOne({ storeId: product.storeId });
  if (!store || store.userId !== userId) return err("FORBIDDEN", "not your product", 403);

  const merged: ProductCreateRequest = {
    name: body.name ?? product.name,
    description: body.description ?? product.description,
    category: body.category ?? product.category,
    imageUrl: body.imageUrl ?? product.imageUrl,
    unitCode: body.unitCode ?? product.unitCode,
    currency: body.currency ?? product.currency,
    options: body.options ?? product.options,
    variants: (body.variants ?? product.variants).map((v) => ({
      // Include variantId when present so sameOptionValues-preservation honors client intent
      ...(("variantId" in v && v.variantId) ? { variantId: v.variantId } : {}),
      optionValues: v.optionValues,
      price: v.price,
      stock: v.stock,
      sku: v.sku,
      imageUrl: v.imageUrl,
    })) as ProductCreateRequest["variants"],
  };
  const validation = validateProductPayload(merged);
  if (!validation.valid) {
    return err(
      "INVALID_PRODUCT",
      validation.errors.map((e) => `${e.field}: ${e.message}`).join("; "),
      400
    );
  }

  const now = new Date();
  const nextVariants: ProductVariant[] = merged.variants.map((v) => {
    // Honor client-provided variantId when present (preserves external refs, e.g. carts).
    // Otherwise match by optionValues to preserve identity across combo renames.
    const byId = (v as ProductVariant).variantId
      ? product.variants.find((ev) => ev.variantId === (v as ProductVariant).variantId)
      : undefined;
    const matched = byId ?? product.variants.find((ev) => sameOptionValues(ev.optionValues, v.optionValues));
    return {
      variantId: matched?.variantId ?? crypto.randomUUID(),
      optionValues: v.optionValues,
      price: v.price,
      stock: v.stock,
      sku: v.sku,
      imageUrl: v.imageUrl,
    };
  });

  const update = {
    name: merged.name,
    description: merged.description,
    category: merged.category,
    imageUrl: merged.imageUrl,
    unitCode: merged.unitCode,
    currency: merged.currency,
    options: merged.options ?? [],
    variants: nextVariants,
    available: body.available ?? product.available,
    updatedAt: now,
  };
  await db.collection<Product>("products").updateOne({ productId }, { $set: update });
  return { ...product, ...update } as Product;
}

export async function softDeleteProduct(
  db: Db,
  userId: string,
  productId: string
): Promise<{ message: string } | ProductServiceError> {
  const product = await db.collection<Product>("products").findOne({ productId });
  if (!product) return err("NOT_FOUND", "product does not exist", 404);
  const store = await db.collection<Store>("stores").findOne({ storeId: product.storeId });
  if (!store || store.userId !== userId) return err("FORBIDDEN", "not your product", 403);
  await db
    .collection<Product>("products")
    .updateOne({ productId }, { $set: { available: false, updatedAt: new Date() } });
  return { message: "product archived" };
}

export async function getProduct(db: Db, productId: string): Promise<Product | null> {
  return db.collection<Product>("products").findOne({ productId });
}

export async function listProductsForStore(
  db: Db,
  storeId: string,
  includeUnavailable = false
): Promise<Product[]> {
  const filter: Record<string, unknown> = { storeId };
  if (!includeUnavailable) filter.available = true;
  return db.collection<Product>("products").find(filter).sort({ createdAt: -1 }).toArray();
}

/**
 * Atomically reserve stock for a variant. Returns false if insufficient stock.
 */
export async function reserveVariantStock(
  db: Db,
  productId: string,
  variantId: string,
  qty: number
): Promise<boolean> {
  const r = await db.collection<Product>("products").findOneAndUpdate(
    { productId, variants: { $elemMatch: { variantId, stock: { $gte: qty } } } },
    { $inc: { "variants.$.stock": -qty } }
  );
  // mongodb v6 default: returns the updated document or null on no-match
  return r !== null;
}

/** Restore previously reserved stock. */
export async function restoreVariantStock(
  db: Db,
  productId: string,
  variantId: string,
  qty: number
): Promise<void> {
  await db.collection<Product>("products").updateOne(
    { productId, "variants.variantId": variantId },
    { $inc: { "variants.$.stock": qty } }
  );
}
