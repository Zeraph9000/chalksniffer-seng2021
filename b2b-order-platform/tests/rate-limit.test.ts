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
