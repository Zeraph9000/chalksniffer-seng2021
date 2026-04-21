import { generateGuestToken } from "@/lib/guest-token";

test("generateGuestToken returns ~43 char base64url", () => {
  const t = generateGuestToken();
  expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(t.length).toBeGreaterThanOrEqual(40);
});

test("two generated tokens are not equal", () => {
  expect(generateGuestToken()).not.toBe(generateGuestToken());
});
