import type { CartTotals, CartTotalsInput } from "./types";

export function calculateCartTotals(input: CartTotalsInput): CartTotals {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const itemDiscountTotal = input.items.reduce((sum, item) => sum + item.discountTotal, 0);
  const discountTotal = itemDiscountTotal + input.loyaltyDiscount;

  return {
    subtotal,
    discountTotal,
    shippingTotal: input.shippingTotal,
    grandTotal: Math.max(subtotal - discountTotal + input.shippingTotal, 0),
  };
}
