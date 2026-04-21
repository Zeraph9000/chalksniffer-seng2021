jest.mock("@/lib/buyer-session");
import { GET } from "@/app/api/buyer/me/route";
import { getBuyerProfile } from "@/lib/buyer-session";

const mock = getBuyerProfile as jest.Mock;

beforeEach(() => mock.mockReset());

test("returns null when not a buyer", async () => {
  mock.mockResolvedValue(null);
  const res = await GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toBeNull();
});

test("returns profile when buyer", async () => {
  mock.mockResolvedValue({
    name: "Alice",
    email: "a@x",
    phone: "123",
    address: {
      streetName: "1 High St",
      cityName: "Sydney",
      postalZone: "2000",
      country: "AU",
    },
    companyName: "Buyer Co",
    abn: "12345",
  });
  const res = await GET();
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ name: "Alice", email: "a@x" });
  expect(body.address.cityName).toBe("Sydney");
});
