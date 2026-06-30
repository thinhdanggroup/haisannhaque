export type FlashSaleEvent = {
  id: string;
  name: string;
  discountPct: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdAt: string;
};

export type ActiveFlashSale = {
  id: string;
  name: string;
  discountPct: number;
  endAt: string;
  productIds: string[];
};
