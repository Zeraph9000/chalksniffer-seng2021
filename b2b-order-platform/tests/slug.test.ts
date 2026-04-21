import {
  slugify,
  isValidSlugFormat,
  isReservedSlug,
  generateUniqueSlug,
} from "@/lib/slug";
import { setupTestDb, TestDbHandle } from "./helpers/test-db";

describe("slugify", () => {
  test("lowercases and hyphenates", () => {
    expect(slugify("Acme Bakery")).toBe("acme-bakery");
  });
  test("strips diacritics", () => {
    expect(slugify("Café Déjà")).toBe("cafe-deja");
  });
  test("collapses repeated separators", () => {
    expect(slugify("Hello -- World!!")).toBe("hello-world");
  });
  test("trims leading/trailing hyphens", () => {
    expect(slugify("!!Pastries!!")).toBe("pastries");
  });
  test("empty on all-symbol input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("isValidSlugFormat", () => {
  test("accepts lowercase hyphenated", () => {
    expect(isValidSlugFormat("acme-bakery")).toBe(true);
  });
  test("rejects uppercase", () => {
    expect(isValidSlugFormat("Acme")).toBe(false);
  });
  test("rejects leading hyphen", () => {
    expect(isValidSlugFormat("-acme")).toBe(false);
  });
  test("rejects too short", () => {
    expect(isValidSlugFormat("a")).toBe(false);
  });
  test("rejects empty", () => {
    expect(isValidSlugFormat("")).toBe(false);
  });
});

describe("isReservedSlug", () => {
  test("flags admin and api", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
  });
  test("allows normal names", () => {
    expect(isReservedSlug("acme-bakery")).toBe(false);
  });
});

describe("generateUniqueSlug", () => {
  let handle: TestDbHandle;

  beforeAll(async () => {
    handle = await setupTestDb();
  });

  afterAll(async () => {
    await handle.close();
  });

  beforeEach(async () => {
    await handle.db.collection("stores").deleteMany({});
  });

  test("returns base when free", async () => {
    expect(await generateUniqueSlug("acme-bakery", handle.db)).toBe("acme-bakery");
  });

  test("appends -2 on collision", async () => {
    await handle.db.collection("stores").insertOne({ slug: "acme-bakery" });
    expect(await generateUniqueSlug("acme-bakery", handle.db)).toBe("acme-bakery-2");
  });

  test("increments past -2 on chained collision", async () => {
    await handle.db.collection("stores").insertMany([
      { slug: "acme-bakery" },
      { slug: "acme-bakery-2" },
    ]);
    expect(await generateUniqueSlug("acme-bakery", handle.db)).toBe("acme-bakery-3");
  });

  test("falls back to 'store' when base is empty", async () => {
    expect(await generateUniqueSlug("", handle.db)).toBe("store");
  });

  test("falls back to 'store' when base is reserved", async () => {
    expect(await generateUniqueSlug("api", handle.db)).toBe("store");
  });

  test("uses sanitized 'store' base for suffix when reserved base collides", async () => {
    await handle.db.collection("stores").insertOne({ slug: "store" });
    expect(await generateUniqueSlug("api", handle.db)).toBe("store-2");
  });
});
