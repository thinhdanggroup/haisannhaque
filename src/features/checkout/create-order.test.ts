import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./schema";

describe("checkoutSchema", () => {
  it("accepts a valid COD checkout payload", () => {
    const result = checkoutSchema.safeParse({
      cartId: "018f0000-0000-4000-8000-000000000001",
      receiverName: "Nguyen Van A",
      phone: "0900000000",
      province: "Ho Chi Minh",
      district: "Quan 1",
      ward: "Ben Nghe",
      addressLine: "1 Le Loi",
      paymentMethod: "cod",
      deliveryMethod: "local_delivery",
      idempotencyKey: "checkout-0001",
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported payment methods", () => {
    const result = checkoutSchema.safeParse({
      cartId: "018f0000-0000-4000-8000-000000000001",
      receiverName: "Nguyen Van A",
      phone: "0900000000",
      province: "Ho Chi Minh",
      district: "Quan 1",
      ward: "Ben Nghe",
      addressLine: "1 Le Loi",
      paymentMethod: "card",
      deliveryMethod: "local_delivery",
      idempotencyKey: "checkout-0001",
    });

    expect(result.success).toBe(false);
  });
});
