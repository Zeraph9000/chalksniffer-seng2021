import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";

let mongod: MongoMemoryServer | null = null;
let client: MongoClient | null = null;

export async function getTestDb(): Promise<Db> {
  if (!mongod) {
    mongod = await MongoMemoryServer.create();
  }
  if (!client) {
    client = new MongoClient(mongod.getUri());
    await client.connect();
  }
  return client.db(`test-${Date.now()}`);
}

export async function closeTestDb(): Promise<void> {
  if (client) { await client.close(); client = null; }
  if (mongod) { await mongod.stop(); mongod = null; }
}
