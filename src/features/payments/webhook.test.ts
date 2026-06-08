import { describe, expect, it } from "vitest";
import { normalizePaymentStatus } from "./webhook";

describe("normalizePaymentStatus", () => {
  it("maps successful MoMo result to paid", () => {
    expect(normalizePaymentStatus("momo", "0")).toBe("paid");
  });

  it("maps successful VNPAY result to paid", () => {
    expect(normalizePaymentStatus("vnpay", "00")).toBe("paid");
  });

  it("maps failed provider result to failed", () => {
    expect(normalizePaymentStatus("vnpay", "24")).toBe("failed");
  });
});
