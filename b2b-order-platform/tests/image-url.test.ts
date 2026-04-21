import { transformedImageUrl } from "@/lib/image-url";

describe("transformedImageUrl", () => {
  test("injects logo transform for cloudinary URLs", () => {
    const out = transformedImageUrl(
      "https://res.cloudinary.com/demo/image/upload/v1/chalksniffer/logo/abc.jpg",
      "logo"
    );
    expect(out).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_400,h_400/v1/chalksniffer/logo/abc.jpg"
    );
  });

  test("injects banner transform", () => {
    const out = transformedImageUrl(
      "https://res.cloudinary.com/demo/image/upload/v1/chalksniffer/banner/abc.jpg",
      "banner"
    );
    expect(out).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1600,h_500/v1/chalksniffer/banner/abc.jpg"
    );
  });

  test("injects avatar transform", () => {
    const out = transformedImageUrl(
      "https://res.cloudinary.com/demo/image/upload/v1/chalksniffer/avatar/abc.jpg",
      "avatar"
    );
    expect(out).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_200,h_200/v1/chalksniffer/avatar/abc.jpg"
    );
  });

  test("injects product transform", () => {
    const out = transformedImageUrl(
      "https://res.cloudinary.com/demo/image/upload/v1/chalksniffer/product/abc.jpg",
      "product"
    );
    expect(out).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_800,h_800/v1/chalksniffer/product/abc.jpg"
    );
  });

  test("passes through external (non-cloudinary) URLs", () => {
    const u = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800";
    expect(transformedImageUrl(u, "product")).toBe(u);
  });

  test("empty / null / undefined input → empty string", () => {
    expect(transformedImageUrl("", "logo")).toBe("");
    expect(transformedImageUrl(undefined, "logo")).toBe("");
    expect(transformedImageUrl(null, "logo")).toBe("");
  });
});
