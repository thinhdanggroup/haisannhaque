export type OrderStatus =
  | "draft_checkout"
  | "awaiting_payment"
  | "payment_failed"
  | "pending_confirmation"
  | "confirmed"
  | "picking"
  | "packed"
  | "dispatched"
  | "delivery_attempted"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned"
  | "partially_returned"
  | "refunded";

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  draft_checkout: ["awaiting_payment", "pending_confirmation", "cancelled"],
  awaiting_payment: ["pending_confirmation", "payment_failed", "cancelled"],
  payment_failed: ["awaiting_payment", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["picking", "cancelled"],
  picking: ["packed", "cancelled"],
  packed: ["dispatched"],
  dispatched: ["delivery_attempted", "delivered"],
  delivery_attempted: ["dispatched", "cancelled"],
  delivered: ["completed", "returned", "partially_returned"],
  completed: ["returned", "partially_returned", "refunded"],
  cancelled: [],
  returned: ["refunded"],
  partially_returned: ["refunded", "completed"],
  refunded: [],
};

export function canTransitionOrder(current: OrderStatus, next: OrderStatus): boolean {
  return allowedTransitions[current].includes(next);
}
