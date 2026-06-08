import { describe, expect, it } from "vitest";
import { calculateCartTotals } from "./pricing";

describe("calculateCartTotals", () => {
  it("calculates subtotal, discount, shipping, and grand total", () => {
    const totals = calculateCartTotals({
      items: [
        { quantity: 2, unitPrice: 100000, discountTotal: 10000 },
        { quantity: 1, unitPrice: 50000, discountTotal: 0 },
      ],
      shippingTotal: 20000,
      loyaltyDiscount: 5000,
    });

    expect(totals.subtotal).toBe(250000);
    expect(totals.discountTotal).toBe(15000);
    expect(totals.grandTotal).toBe(255000);
  });

  it("does not allow a negative grand total", () => {
    const totals = calculateCartTotals({
      items: [{ quantity: 1, unitPrice: 10000, discountTotal: 0 }],
      shippingTotal: 0,
      loyaltyDiscount: 20000,
    });

    expect(totals.grandTotal).toBe(0);
  });
});
