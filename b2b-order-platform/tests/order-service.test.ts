import { setupTestDb, TestDbHandle } from "./helpers/test-db";
import { createMapping, transitionStatus, getMapping } from "@/lib/order-service";

let handle: TestDbHandle;
beforeAll(async () => { handle = await setupTestDb(); });
afterAll(async () => { await handle.close(); });

describe("order-service", () => {
  test("createMapping inserts with placed status + statusHistory entry", async () => {
    const mapping = await createMapping(handle.db, {
      orderId: "o1", storeId: "s1", sellerId: "seller1", buyerId: null,
      buyerEmail: "b@example.com", buyerName: "Buyer", buyerPhone: "+1",
      buyerAddress: { streetName: "1 St", cityName: "Sydney", postalZone: "2000", country: "AU" },
      payableAmount: 100, documentCurrencyCode: "AUD", issueDate: "2026-04-21",
      guestAccessToken: "tkn",
    });
    expect(mapping.status).toBe("placed");
    expect(mapping.statusHistory).toHaveLength(1);
    expect(mapping.statusHistory[0].status).toBe("placed");

    const fetched = await getMapping(handle.db, "o1");
    expect(fetched?.orderId).toBe("o1");
  });

  test("transitionStatus rejects illegal transition", async () => {
    await createMapping(handle.db, {
      orderId: "o2", storeId: "s1", sellerId: "seller1", buyerId: null,
      buyerEmail: "b@x.com", buyerName: "B", buyerPhone: "+1",
      buyerAddress: { streetName: "1", cityName: "Sydney", postalZone: "2000", country: "AU" },
      payableAmount: 10, documentCurrencyCode: "AUD", issueDate: "2026-04-21",
    });
    const result = await transitionStatus(handle.db, "o2", "received", null);
    expect("error" in result).toBe(true);
  });

  test("transitionStatus appends history + updates status", async () => {
    await createMapping(handle.db, {
      orderId: "o3", storeId: "s1", sellerId: "seller1", buyerId: null,
      buyerEmail: "b@x.com", buyerName: "B", buyerPhone: "+1",
      buyerAddress: { streetName: "1", cityName: "Sydney", postalZone: "2000", country: "AU" },
      payableAmount: 10, documentCurrencyCode: "AUD", issueDate: "2026-04-21",
    });
    const r1 = await transitionStatus(handle.db, "o3", "paid", "system", "stripe ok");
    expect("error" in r1).toBe(false);

    const m = await getMapping(handle.db, "o3");
    expect(m?.status).toBe("paid");
    expect(m?.statusHistory).toHaveLength(2);
    expect(m?.statusHistory[1].note).toBe("stripe ok");
  });
});
