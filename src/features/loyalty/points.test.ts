import { describe, expect, it } from "vitest";
import { calculateAwardedPoints } from "./points";

describe("calculateAwardedPoints", () => {
  it("awards one point per configured spend rate", () => {
    expect(calculateAwardedPoints({ grandTotal: 125000, rate: 1000 })).toBe(125);
  });

  it("rounds down fractional points", () => {
    expect(calculateAwardedPoints({ grandTotal: 125999, rate: 1000 })).toBe(125);
  });
});
