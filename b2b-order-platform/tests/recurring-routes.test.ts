jest.mock("@/lib/buyer-session");
jest.mock("@/lib/chalksniffer-client");
import { GET as listGET } from "@/app/api/orders/recurring/route";
import {
  GET as idGET,
  PATCH as idPATCH,
  DELETE as idDELETE,
} from "@/app/api/orders/recurring/[id]/route";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { chalksniffer } from "@/lib/chalksniffer-client";

const buyer = { userId: "buyer-1", role: "buyer", name: "A", email: "a@x" };
const mockBuyer = getBuyerSessionOrNull as jest.Mock;
const mockList = chalksniffer.listRecurring as jest.Mock;
const mockGet = chalksniffer.getRecurring as jest.Mock;
const mockPatch = chalksniffer.updateRecurring as jest.Mock;
const mockDelete = chalksniffer.deleteRecurring as jest.Mock;

beforeEach(() => {
  [mockBuyer, mockList, mockGet, mockPatch, mockDelete].forEach((m) => m.mockReset());
});

test("list rejects without buyer cookie", async () => {
  mockBuyer.mockResolvedValue(null);
  const res = await listGET();
  expect(res.status).toBe(401);
});

test("list returns buyer's recurring orders", async () => {
  mockBuyer.mockResolvedValue(buyer);
  mockList.mockResolvedValue([{ id: "r1" }]);
  const res = await listGET();
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject([{ id: "r1" }]);
});

test("list returns [] when chalksniffer returns null", async () => {
  mockBuyer.mockResolvedValue(buyer);
  mockList.mockResolvedValue(null);
  const res = await listGET();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([]);
});

test("id GET 401 without buyer", async () => {
  mockBuyer.mockResolvedValue(null);
  const res = await idGET({} as NextRequest, { params: { id: "r1" } });
  expect(res.status).toBe(401);
});

test("id GET 404 when chalksniffer returns null", async () => {
  mockBuyer.mockResolvedValue(buyer);
  mockGet.mockResolvedValue(null);
  const res = await idGET({} as NextRequest, { params: { id: "r1" } });
  expect(res.status).toBe(404);
});

test("id GET returns row", async () => {
  mockBuyer.mockResolvedValue(buyer);
  mockGet.mockResolvedValue({ id: "r1", frequency: "Weekly" });
  const res = await idGET({} as NextRequest, { params: { id: "r1" } });
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ id: "r1" });
});

test("id PATCH 401 without buyer", async () => {
  mockBuyer.mockResolvedValue(null);
  const req = { json: async () => ({ frequency: "Daily" }) } as NextRequest;
  const res = await idPATCH(req, { params: { id: "r1" } });
  expect(res.status).toBe(401);
});

test("id PATCH forwards body to chalksniffer", async () => {
  mockBuyer.mockResolvedValue(buyer);
  mockPatch.mockResolvedValue({ ok: true, status: 200, body: { id: "r1", frequency: "Daily" } });
  const req = { json: async () => ({ frequency: "Daily" }) } as NextRequest;
  const res = await idPATCH(req, { params: { id: "r1" } });
  expect(res.status).toBe(200);
  expect(mockPatch).toHaveBeenCalledWith("r1", { frequency: "Daily" });
});

test("id DELETE calls chalksniffer.deleteRecurring with buyer cookie", async () => {
  mockBuyer.mockResolvedValue(buyer);
  mockDelete.mockResolvedValue({ ok: true, status: 204 });
  const res = await idDELETE({} as NextRequest, { params: { id: "r1" } });
  expect(res.status).toBe(204);
  expect(mockDelete).toHaveBeenCalledWith("r1");
});

// `NextRequest` import placeholder
import type { NextRequest } from "next/server";
