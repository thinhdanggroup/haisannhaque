export type CartPricingItem = {
  quantity: number;
  unitPrice: number;
  discountTotal: number;
};

export type CartTotalsInput = {
  items: CartPricingItem[];
  shippingTotal: number;
  loyaltyDiscount: number;
};

export type CartTotals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
};

export type CartLineItem = {
  id: string;
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountTotal: number;
  imageUrl: string | null;
};
