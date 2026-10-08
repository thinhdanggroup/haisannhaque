import { describe, expect, it } from "vitest";
import { calculateDiscountPercent, formatVnd, parsePrice } from "./format";

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

describe("formatVnd decimals", () => {
  it("keeps up to two decimal places", () => {
    expect(formatVnd(125500.5)).toBe("125.500,5d");
  });
});

describe("parsePrice", () => {
  it("parses plain integers and dot decimals", () => {
    expect(parsePrice("125000")).toBe(125000);
    expect(parsePrice("125500.5")).toBe(125500.5);
  });

  it("parses Vietnamese notation", () => {
    expect(parsePrice("125,5")).toBe(125.5);
    expect(parsePrice("1.250.000")).toBe(1250000);
    expect(parsePrice("125.500,75")).toBe(125500.75);
    expect(parsePrice("125.000 ₫")).toBe(125000);
  });

  it("rounds to two decimals and rejects junk", () => {
    expect(parsePrice("10.5555")).toBe(10.56);
    expect(parsePrice("")).toBeNaN();
    expect(parsePrice("abc")).toBeNaN();
  });
});
