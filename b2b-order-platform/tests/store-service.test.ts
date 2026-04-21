import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Db, Filter, MatchKeysAndValues, OptionalUnlessRequiredId, UpdateFilter } from "mongodb";
import {
  createStore,
  isStoreServiceError,
  updateStore,
  updateStoreStatus,
  validateStorePayload,
} from "../src/lib/store-service";
import { Store } from "../src/lib/types";

class StoreCollection {
  stores: Store[] = [];

  async findOne(filter: Filter<Store>) {
    if (filter.userId) return this.stores.find((store) => store.userId === filter.userId) ?? null;
    if (filter.storeId) return this.stores.find((store) => store.storeId === filter.storeId) ?? null;
    return null;
  }

  async insertOne(store: OptionalUnlessRequiredId<Store>) {
    this.stores.push(store as Store);
    return { insertedId: store.storeId };
  }

  async updateOne(filter: Filter<Store>, update: UpdateFilter<Store>) {
    const store = await this.findOne(filter);
    if (!store) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(store, update.$set as MatchKeysAndValues<Store>);
    return { matchedCount: 1, modifiedCount: 1 };
  }
}

function makeDb(collection: StoreCollection): Db {
  return {
    collection: () => collection,
  } as unknown as Db;
}

describe("store service", () => {
  it("validates required create fields", () => {
    const result = validateStorePayload({ storeName: "Northside Chalk" });

    assert.equal(result.valid, false);
    assert.deepEqual(
      result.errors.map((error) => error.field),
      ["description", "status"]
    );
  });

  it("creates one store for a seller", async () => {
    const collection = new StoreCollection();
    const result = await createStore(makeDb(collection), "seller-1", {
      storeName: "Northside Chalk",
      description: "Bulk chalk and classroom supplies",
      status: "active",
      location: "Sydney",
    });

    assert.equal(isStoreServiceError(result), false);
    assert.equal(collection.stores.length, 1);
    assert.equal(collection.stores[0].userId, "seller-1");
    assert.equal(collection.stores[0].status, "active");
  });

  it("rejects duplicate stores for the same seller", async () => {
    const collection = new StoreCollection();
    const db = makeDb(collection);

    await createStore(db, "seller-1", {
      storeName: "Northside Chalk",
      description: "Bulk chalk and classroom supplies",
      status: "active",
    });

    const duplicate = await createStore(db, "seller-1", {
      storeName: "Second Store",
      description: "Duplicate",
      status: "active",
    });

    assert.equal(isStoreServiceError(duplicate), true);
    if (isStoreServiceError(duplicate)) assert.equal(duplicate.status, 409);
  });

  it("updates only stores owned by the authenticated seller", async () => {
    const collection = new StoreCollection();
    const db = makeDb(collection);
    const created = await createStore(db, "seller-1", {
      storeName: "Northside Chalk",
      description: "Bulk chalk and classroom supplies",
      status: "active",
    });

    assert.equal(isStoreServiceError(created), false);
    if (isStoreServiceError(created)) return;

    const forbidden = await updateStore(db, "seller-2", created.storeId, {
      description: "Updated by someone else",
    });
    assert.equal(isStoreServiceError(forbidden), true);
    if (isStoreServiceError(forbidden)) assert.equal(forbidden.status, 403);

    const updated = await updateStore(db, "seller-1", created.storeId, {
      description: "Updated store description",
    });
    assert.equal(isStoreServiceError(updated), false);
    if (!isStoreServiceError(updated)) assert.equal(updated.description, "Updated store description");
  });

  it("updates status and rejects invalid status values", async () => {
    const collection = new StoreCollection();
    const db = makeDb(collection);
    const created = await createStore(db, "seller-1", {
      storeName: "Northside Chalk",
      description: "Bulk chalk and classroom supplies",
      status: "active",
    });

    assert.equal(isStoreServiceError(created), false);
    if (isStoreServiceError(created)) return;

    const invalid = await updateStoreStatus(db, "seller-1", created.storeId, "archived");
    assert.equal(isStoreServiceError(invalid), true);
    if (isStoreServiceError(invalid)) assert.equal(invalid.status, 400);

    const closed = await updateStoreStatus(db, "seller-1", created.storeId, "closed");
    assert.equal(isStoreServiceError(closed), false);
    if (!isStoreServiceError(closed)) assert.equal(closed.status, "closed");
  });
});
