import { describe, expect, it } from "vitest";
import { calculateDiscountPercent, formatVnd } from "./format";

describe("formatVnd", () => {
  it("formats Vietnamese dong values with Vietnamese numeric grouping", () => {
    expect(formatVnd(499000)).toBe("499.000d");
  });
});

describe("calculateDiscountPercent", () => {
  it("rounds the discount percentage from compare-at price", () => {
    expect(calculateDiscountPercent(499000, 745000)).toBe(33);
  });

  it("returns null without a compare-at price", () => {
    expect(calculateDiscountPercent(745000, null)).toBeNull();
  });

  it("returns null when the compare-at price is equal to the price", () => {
    expect(calculateDiscountPercent(745000, 745000)).toBeNull();
  });

  it("returns null when the compare-at price is lower than the price", () => {
    expect(calculateDiscountPercent(745000, 499000)).toBeNull();
  });

  it("returns null when the compare-at price is zero or negative", () => {
    expect(calculateDiscountPercent(499000, 0)).toBeNull();
    expect(calculateDiscountPercent(499000, -745000)).toBeNull();
  });

  it("returns null when the price is negative", () => {
    expect(calculateDiscountPercent(-1, 745000)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(calculateDiscountPercent(Number.NaN, 745000)).toBeNull();
    expect(calculateDiscountPercent(Number.POSITIVE_INFINITY, 745000)).toBeNull();
    expect(calculateDiscountPercent(499000, Number.NaN)).toBeNull();
    expect(calculateDiscountPercent(499000, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
