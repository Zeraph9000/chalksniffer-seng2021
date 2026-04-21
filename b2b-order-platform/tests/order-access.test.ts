import { authorizeOrderAccess } from "@/lib/order-access";
import { setupTestDb, TestDbHandle } from "./helpers/test-db";

jest.mock("@/lib/buyer-session");
jest.mock("@/lib/seller-session");
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { getSellerSessionOrNull } from "@/lib/seller-session";

const mockBuyer = getBuyerSessionOrNull as jest.Mock;
const mockSeller = getSellerSessionOrNull as jest.Mock;

let handle: TestDbHandle;

beforeAll(async () => { handle = await setupTestDb(); });
afterAll(async () => { await handle.close(); });

beforeEach(async () => {
  mockBuyer.mockReset();
  mockSeller.mockReset();
  await handle.db.collection("orderMappings").deleteMany({});
});

const mapping = {
  orderId: "ord-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  storeId: "store-1",
  guestAccessToken: "tok-1",
};

test("guest token wins over nothing else", async () => {
  await handle.db.collection("orderMappings").insertOne(mapping);
  mockBuyer.mockResolvedValue(null);
  mockSeller.mockResolvedValue(null);
  const r = await authorizeOrderAccess(handle.db, "ord-1", "tok-1");
  expect(r).toMatchObject({ role: "guest" });
});

test("buyer cookie authorizes buyer access", async () => {
  await handle.db.collection("orderMappings").insertOne(mapping);
  mockBuyer.mockResolvedValue({ userId: "buyer-1", role: "buyer", name: "A", email: "a@x" });
  mockSeller.mockResolvedValue(null);
  const r = await authorizeOrderAccess(handle.db, "ord-1", null);
  expect(r).toMatchObject({ role: "buyer", userId: "buyer-1" });
});

test("seller cookie authorizes seller access", async () => {
  await handle.db.collection("orderMappings").insertOne(mapping);
  mockBuyer.mockResolvedValue(null);
  mockSeller.mockResolvedValue({ userId: "seller-1", role: "seller", name: "S", email: "s@x" });
  const r = await authorizeOrderAccess(handle.db, "ord-1", null);
  expect(r).toMatchObject({ role: "seller", userId: "seller-1" });
});

test("no cookie, no token → NOT_FOUND", async () => {
  await handle.db.collection("orderMappings").insertOne(mapping);
  mockBuyer.mockResolvedValue(null);
  mockSeller.mockResolvedValue(null);
  const r = await authorizeOrderAccess(handle.db, "ord-1", null);
  expect(r).toMatchObject({ error: "NOT_FOUND" });
});

test("wrong buyer cookie → NOT_FOUND (no leak)", async () => {
  await handle.db.collection("orderMappings").insertOne(mapping);
  mockBuyer.mockResolvedValue({ userId: "other", role: "buyer", name: "O", email: "o@x" });
  mockSeller.mockResolvedValue(null);
  const r = await authorizeOrderAccess(handle.db, "ord-1", null);
  expect(r).toMatchObject({ error: "NOT_FOUND" });
});

test("seller priority over buyer when both cookies match the mapping", async () => {
  // Real-world trigger: same browser holds chalk.buyer and chalk.seller after
  // test-buying from your own store. Dashboard actions (despatch, cancel)
  // require seller role, so seller-of-the-order wins.
  await handle.db.collection("orderMappings").insertOne(mapping);
  mockBuyer.mockResolvedValue({ userId: "buyer-1", role: "buyer", name: "A", email: "a@x" });
  mockSeller.mockResolvedValue({ userId: "seller-1", role: "seller", name: "S", email: "s@x" });
  const r = await authorizeOrderAccess(handle.db, "ord-1", null);
  expect(r).toMatchObject({ role: "seller" });
});

test("non-existent order → NOT_FOUND without calling session", async () => {
  mockBuyer.mockResolvedValue({ userId: "buyer-1", role: "buyer", name: "A", email: "a@x" });
  const r = await authorizeOrderAccess(handle.db, "missing", null);
  expect(r).toMatchObject({ error: "NOT_FOUND" });
});
