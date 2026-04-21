jest.mock("@/lib/session");
jest.mock("@/lib/cloudinary-client");
import { POST } from "@/app/api/upload/route";
import { getSessionOrNull } from "@/lib/session";
import { cloudinary } from "@/lib/cloudinary-client";

const mockSession = getSessionOrNull as jest.Mock;
const mockUpload = cloudinary.uploader.upload_stream as jest.Mock;

function mkReq(form: FormData): import("next/server").NextRequest {
  return {
    formData: async () => form,
  } as unknown as import("next/server").NextRequest;
}

function mkFile(size: number, type: string): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], "test.bin", { type });
}

const seller = { userId: "s1", role: "seller" as const, name: "S", email: "s@x" };
const buyer = { userId: "b1", role: "buyer" as const, name: "B", email: "b@x" };

beforeEach(() => {
  mockSession.mockReset();
  mockUpload.mockReset();
  mockUpload.mockImplementation((_opts, cb) => {
    const stream = {
      end: (_b: Buffer) => cb(null, { secure_url: "https://res.cloudinary.com/demo/image/upload/v1/test.jpg", public_id: "test" }),
    };
    return stream;
  });
});

test("401 without session", async () => {
  mockSession.mockResolvedValue(null);
  const form = new FormData();
  form.append("kind", "avatar");
  form.append("file", mkFile(100, "image/jpeg"));
  const res = await POST(mkReq(form));
  expect(res.status).toBe(401);
});

test("400 invalid kind", async () => {
  mockSession.mockResolvedValue(seller);
  const form = new FormData();
  form.append("kind", "bogus");
  form.append("file", mkFile(100, "image/jpeg"));
  const res = await POST(mkReq(form));
  expect(res.status).toBe(400);
});

test("403 buyer tries to upload product image", async () => {
  mockSession.mockResolvedValue(buyer);
  const form = new FormData();
  form.append("kind", "product");
  form.append("file", mkFile(100, "image/jpeg"));
  const res = await POST(mkReq(form));
  expect(res.status).toBe(403);
});

test("200 buyer uploads avatar", async () => {
  mockSession.mockResolvedValue(buyer);
  const form = new FormData();
  form.append("kind", "avatar");
  form.append("file", mkFile(100, "image/jpeg"));
  const res = await POST(mkReq(form));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ url: expect.stringContaining("cloudinary"), publicId: "test" });
});

test("400 missing file", async () => {
  mockSession.mockResolvedValue(seller);
  const form = new FormData();
  form.append("kind", "logo");
  const res = await POST(mkReq(form));
  expect(res.status).toBe(400);
});

test("413 oversize file", async () => {
  mockSession.mockResolvedValue(seller);
  const form = new FormData();
  form.append("kind", "logo");
  form.append("file", mkFile(9 * 1024 * 1024, "image/jpeg"));
  const res = await POST(mkReq(form));
  expect(res.status).toBe(413);
});

test("415 unsupported mime", async () => {
  mockSession.mockResolvedValue(seller);
  const form = new FormData();
  form.append("kind", "logo");
  form.append("file", mkFile(100, "image/gif"));
  const res = await POST(mkReq(form));
  expect(res.status).toBe(415);
});

test("502 upstream cloudinary failure", async () => {
  mockSession.mockResolvedValue(seller);
  mockUpload.mockImplementation((_opts, cb) => ({
    end: () => cb(new Error("cloudinary down"), null),
  }));
  const form = new FormData();
  form.append("kind", "logo");
  form.append("file", mkFile(100, "image/jpeg"));
  const res = await POST(mkReq(form));
  expect(res.status).toBe(502);
  expect(await res.json()).toMatchObject({ error: "UPSTREAM_FAILED" });
});

test("200 seller uploads product image", async () => {
  mockSession.mockResolvedValue(seller);
  const form = new FormData();
  form.append("kind", "product");
  form.append("file", mkFile(100, "image/png"));
  const res = await POST(mkReq(form));
  expect(res.status).toBe(200);
});
