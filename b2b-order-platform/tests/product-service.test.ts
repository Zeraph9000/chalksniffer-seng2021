import { setupTestDb, TestDbHandle } from "./helpers/test-db";
import {
  validateProductPayload,
  createProduct,
  reserveVariantStock,
  restoreVariantStock,
} from "@/lib/product-service";

let handle: TestDbHandle;
beforeAll(async () => {
  handle = await setupTestDb();
});
afterAll(async () => {
  await handle.close();
});

describe("validateProductPayload", () => {
  test("rejects missing name", () => {
    const result = validateProductPayload({
      name: "",
      description: "x",
      category: "y",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      options: [],
      variants: [{ optionValues: {}, price: 1, stock: 1 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ field: "name", message: "required" });
  });

  test("rejects when variant option keys mismatch product options", () => {
    const result = validateProductPayload({
      name: "X",
      description: "x",
      category: "y",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      options: [{ name: "Size", values: ["S", "M"] }],
      variants: [{ optionValues: {}, price: 1, stock: 1 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "variants")).toBe(true);
  });

  test("accepts valid product with variants", () => {
    const result = validateProductPayload({
      name: "X",
      description: "x",
      category: "y",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      options: [{ name: "Size", values: ["S", "M"] }],
      variants: [
        { optionValues: { Size: "S" }, price: 1, stock: 1 },
        { optionValues: { Size: "M" }, price: 1, stock: 1 },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects duplicate variant combos", () => {
    const result = validateProductPayload({
      name: "X",
      description: "x",
      category: "y",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      options: [{ name: "Size", values: ["S"] }],
      variants: [
        { optionValues: { Size: "S" }, price: 1, stock: 1 },
        { optionValues: { Size: "S" }, price: 2, stock: 2 },
      ],
    });
    expect(result.valid).toBe(false);
  });
});

describe("createProduct", () => {
  test("creates with generated productId and variantIds", async () => {
    await handle.db.collection("stores").insertOne({
      storeId: "store-1",
      userId: "u-1",
      storeName: "s",
      description: "s",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await createProduct(handle.db, "u-1", {
      name: "X",
      description: "x",
      category: "y",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      options: [],
      variants: [{ optionValues: {}, price: 10, stock: 5 }],
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.productId).toBeDefined();
    expect(result.storeId).toBe("store-1");
    expect(result.variants[0].variantId).toBeDefined();
  });

  test("returns 403 if user has no store", async () => {
    const result = await createProduct(handle.db, "u-no-store", {
      name: "X",
      description: "x",
      category: "y",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      options: [],
      variants: [{ optionValues: {}, price: 1, stock: 1 }],
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.status).toBe(403);
  });
});

describe("stock atomicity", () => {
  test("reserve decrements stock when sufficient", async () => {
    await handle.db.collection("products").insertOne({
      productId: "p1",
      storeId: "s1",
      name: "x",
      description: "x",
      category: "c",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      available: true,
      options: [],
      variants: [{ variantId: "v1", optionValues: {}, price: 1, stock: 5 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(await reserveVariantStock(handle.db, "p1", "v1", 3)).toBe(true);
    const after = await handle.db.collection("products").findOne({ productId: "p1" });
    expect((after as unknown as { variants: { stock: number }[] }).variants[0].stock).toBe(2);
  });

  test("reserve fails when insufficient stock (race defense)", async () => {
    await handle.db.collection("products").insertOne({
      productId: "p2",
      storeId: "s1",
      name: "x",
      description: "x",
      category: "c",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      available: true,
      options: [],
      variants: [{ variantId: "v1", optionValues: {}, price: 1, stock: 2 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(await reserveVariantStock(handle.db, "p2", "v1", 3)).toBe(false);
    const after = await handle.db.collection("products").findOne({ productId: "p2" });
    expect((after as unknown as { variants: { stock: number }[] }).variants[0].stock).toBe(2);
  });

  test("restore increments", async () => {
    await handle.db.collection("products").insertOne({
      productId: "p3",
      storeId: "s1",
      name: "x",
      description: "x",
      category: "c",
      imageUrls: ["u"],
      unitCode: "each",
      currency: "AUD",
      available: true,
      options: [],
      variants: [{ variantId: "v1", optionValues: {}, price: 1, stock: 0 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await restoreVariantStock(handle.db, "p3", "v1", 2);
    const after = await handle.db.collection("products").findOne({ productId: "p3" });
    expect((after as unknown as { variants: { stock: number }[] }).variants[0].stock).toBe(2);
  });
});
