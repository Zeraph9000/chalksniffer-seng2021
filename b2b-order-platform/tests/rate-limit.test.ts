import { allow } from "@/lib/rate-limit";

test("allows within limit", () => {
  expect(allow("k1", 3, 1000)).toBe(true);
  expect(allow("k1", 3, 1000)).toBe(true);
  expect(allow("k1", 3, 1000)).toBe(true);
});

test("blocks after limit", () => {
  for (let i = 0; i < 3; i++) allow("k2", 3, 1000);
  expect(allow("k2", 3, 1000)).toBe(false);
});

test("allows again after window expires", async () => {
  expect(allow("k3", 1, 10)).toBe(true);
  expect(allow("k3", 1, 10)).toBe(false);
  // Wait past the 10 ms window
  await new Promise((r) => setTimeout(r, 15));
  expect(allow("k3", 1, 10)).toBe(true);
});
