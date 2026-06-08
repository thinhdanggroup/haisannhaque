import { describe, expect, it } from "vitest";
import { refundSchema } from "./schema";

describe("refundSchema", () => {
  it("accepts a valid refund payload", () => {
    const result = refundSchema.safeParse({
      orderId: "018f0000-0000-4000-8000-000000000001",
      paymentId: "018f0000-0000-4000-8000-000000000002",
      amount: 129000,
      refundMethod: "gateway",
      reason: "Customer returned damaged item",
    });

    expect(result.success).toBe(true);
  });

  it("rejects refunds without a positive amount", () => {
    const result = refundSchema.safeParse({
      orderId: "018f0000-0000-4000-8000-000000000001",
      amount: 0,
      refundMethod: "gateway",
      reason: "Customer returned damaged item",
    });

    expect(result.success).toBe(false);
  });
});
