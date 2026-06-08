export type InventoryQualityStatus = "sellable" | "quarantined" | "expired" | "damaged";

export type ReservationStatus = "active" | "released" | "converted" | "expired";

export type AvailableStockInput = {
  variantId: string;
  warehouseId: string;
};

export type ReserveStockInput = AvailableStockInput & {
  cartId?: string;
  orderId?: string;
  quantity: number;
};
