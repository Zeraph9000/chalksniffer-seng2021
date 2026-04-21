import { setupTestDb, TestDbHandle } from "./helpers/test-db";
import { validateProductPayload, createProduct } from "@/lib/product-service";

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
      imageUrl: "u",
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
      imageUrl: "u",
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
      imageUrl: "u",
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
      imageUrl: "u",
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
      imageUrl: "u",
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
      imageUrl: "u",
      unitCode: "each",
      currency: "AUD",
      options: [],
      variants: [{ optionValues: {}, price: 1, stock: 1 }],
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.status).toBe(403);
  });
});
