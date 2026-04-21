import { canTransition, ALLOWED_TRANSITIONS } from "@/lib/state-machine";

describe("canTransition", () => {
  test.each([
    ["placed", "paid", true],
    ["placed", "cancelled", true],
    ["paid", "despatched", true],
    ["paid", "cancelled", true],
    ["despatched", "received", true],
    ["received", "invoiced", true],
    ["invoiced", "cancelled", false],
    ["despatched", "cancelled", false],
    ["paid", "received", false],
    ["placed", "despatched", false],
    ["cancelled", "paid", false],
  ] as const)("from %s → %s = %s", (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  test("ALLOWED_TRANSITIONS is the source of truth", () => {
    expect(ALLOWED_TRANSITIONS.placed).toContain("paid");
  });
});
