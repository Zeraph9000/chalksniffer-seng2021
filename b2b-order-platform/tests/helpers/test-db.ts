/**
 * In-memory MongoDB helper for Jest service tests.
 *
 * Each call to `setupTestDb()` starts its own MongoMemoryServer + client.
 * Always await the returned `close()` in `afterAll` to stop the server cleanly.
 * Do NOT share a handle across test files — every file should call `setupTestDb()`.
 *
 * Usage:
 *   const { db, close } = await setupTestDb();
 *   afterAll(close);
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";

export type TestDbHandle = {
  db: Db;
  close: () => Promise<void>;
};

export async function setupTestDb(): Promise<TestDbHandle> {
  const mongod = await MongoMemoryServer.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  const db = client.db(`test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  return {
    db,
    close: async () => {
      await client.close();
      await mongod.stop();
    },
  };
}
