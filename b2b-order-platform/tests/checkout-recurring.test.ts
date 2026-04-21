jest.mock("@/lib/chalksniffer-client");
jest.mock("@/lib/buyer-session");
jest.mock("@/lib/product-service");
jest.mock("@/lib/order-service");
jest.mock("@/lib/stripe-placeholder");
jest.mock("@/lib/guest-token");
jest.mock("@/lib/db", () => {
  const findOne = jest.fn();
  const collection = jest.fn(() => ({
    findOne,
    find: jest.fn(() => ({ sort: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })) })),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    createIndex: jest.fn(),
  }));
  const db = { collection };
  const client = { db: jest.fn(() => db) };
  return { __esModule: true, default: Promise.resolve(client), __findOne: findOne };
});

import { POST } from "@/app/api/checkout/route";
import { chalksniffer } from "@/lib/chalksniffer-client";
import { getProduct, reserveVariantStock } from "@/lib/product-service";
import { createMapping } from "@/lib/order-service";
import { stripePlaceholder } from "@/lib/stripe-placeholder";
import { generateGuestToken } from "@/lib/guest-token";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";

const mockCreate = chalksniffer.createOrder as jest.Mock;
const mockGetProduct = getProduct as jest.Mock;
const mockReserve = reserveVariantStock as jest.Mock;
const mockCreateMapping = createMapping as jest.Mock;
const mockIntent = stripePlaceholder.createPaymentIntent as jest.Mock;
const mockGuestToken = generateGuestToken as jest.Mock;
const mockBuyerSession = getBuyerSessionOrNull as jest.Mock;

// Access the findOne mock via requireMock to avoid the hoisting issue
const mockFindOne: jest.Mock = (jest.requireMock("@/lib/db") as { __findOne: jest.Mock }).__findOne;

const fakeStore = {
  storeId: "store-1",
  storeName: "Test Store",
  userId: "507f1f77bcf86cd799439011",
  status: "active",
  address: { streetName: "1 St", cityName: "Sydney", postalZone: "2000", country: "AU" },
};

const fakeSeller = {
  _id: "507f1f77bcf86cd799439011",
  companyName: "Test Co",
  abn: "123",
  address: { streetName: "1 St", cityName: "Sydney", postalZone: "2000", country: "AU" },
};

beforeEach(() => {
  mockCreate.mockReset();
  mockGetProduct.mockReset();
  mockReserve.mockReset();
  mockCreateMapping.mockReset();
  mockIntent.mockReset();
  mockGuestToken.mockReset();
  mockBuyerSession.mockReset();
  mockFindOne.mockReset();

  // Sensible defaults
  mockCreate.mockResolvedValue({ ok: true, data: { id: "ord-1" } });
  mockGetProduct.mockResolvedValue({
    productId: "p1",
    storeId: "store-1",
    name: "Item",
    currency: "AUD",
    variants: [{ variantId: "v1", price: 10, stock: 100, optionValues: {} }],
    options: [],
    unitCode: "each",
  });
  mockReserve.mockResolvedValue(true);
  mockCreateMapping.mockResolvedValue({ orderId: "ord-1" });
  mockIntent.mockReturnValue({ id: "pi_1", clientSecret: "pi_1_secret" });
  mockGuestToken.mockReturnValue("guest-tok");
  mockBuyerSession.mockResolvedValue(null);

  // db: first findOne returns store, second returns seller
  mockFindOne
    .mockResolvedValueOnce(fakeStore)
    .mockResolvedValueOnce(fakeSeller);
});

function mkReq(body: Record<string, unknown>) {
  return { json: async () => body } as any;
}

const commonBody = {
  items: [{ productId: "p1", variantId: "v1", qty: 1, unitPriceSnapshot: 10 }],
  buyer: {
    email: "a@x", name: "A", phone: "0",
    address: { streetName: "1", cityName: "S", postalZone: "2000", country: "AU" },
  },
  asGuest: true,
};

test("forwards recurring fields when present", async () => {
  await POST(mkReq({ ...commonBody, recurring: { frequency: "Weekly", startDate: "2026-05-01" } }));
  const payload = mockCreate.mock.calls[0][0] as Record<string, unknown>;
  expect(payload.recurring).toEqual({ frequency: "Weekly", startDate: "2026-05-01" });
});

test("omits recurring when absent", async () => {
  await POST(mkReq(commonBody));
  const payload = mockCreate.mock.calls[0][0] as Record<string, unknown>;
  expect(payload.recurring).toBeUndefined();
});
