import { describe, it, expect } from "vitest";
import { applyFlashSalePrice, formatCountdown, getRemainingSeconds } from "./price-utils";

describe("applyFlashSalePrice", () => {
  it("applies 20% discount to 100_000", () => {
    expect(applyFlashSalePrice(100_000, 20)).toBe(80_000);
  });
  it("rounds down fractional result", () => {
    expect(applyFlashSalePrice(100_001, 20)).toBe(80_000);
  });
  it("handles 1% discount", () => {
    expect(applyFlashSalePrice(100_000, 1)).toBe(99_000);
  });
  it("handles 99% discount", () => {
    expect(applyFlashSalePrice(100_000, 99)).toBe(1_000);
  });
});

describe("formatCountdown", () => {
  it("formats 3661 seconds as 01:01:01", () => {
    expect(formatCountdown(3661)).toBe("01:01:01");
  });
  it("formats 0 as 00:00:00", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
  });
  it("formats 86399 as 23:59:59", () => {
    expect(formatCountdown(86399)).toBe("23:59:59");
  });
});

describe("getRemainingSeconds", () => {
  it("returns positive seconds for future date", () => {
    const now = 1_750_000_000_000;
    const endAt = new Date(now + 5_000).toISOString();
    expect(getRemainingSeconds(endAt, now)).toBe(5);
  });
  it("returns 0 for past date", () => {
    const now = 1_750_000_000_000;
    const endAt = new Date(now - 1_000).toISOString();
    expect(getRemainingSeconds(endAt, now)).toBe(0);
  });
});
