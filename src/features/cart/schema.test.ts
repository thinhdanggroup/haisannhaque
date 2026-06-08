import { describe, expect, it } from "vitest";
import { addCartItemSchema, updateCartItemSchema } from "./schema";

describe("cart action schemas", () => {
  it("accepts a valid add-cart payload", () => {
    const result = addCartItemSchema.safeParse({
      cartId: "018f0000-0000-4000-8000-000000000001",
      variantId: "018f0000-0000-4000-8000-000000000002",
      quantity: 2,
      unitPrice: 150000,
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero quantity updates", () => {
    const result = updateCartItemSchema.safeParse({
      cartItemId: "018f0000-0000-4000-8000-000000000003",
      quantity: 0,
    });

    expect(result.success).toBe(false);
  });
});
