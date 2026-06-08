export type PaymentProvider = "cod" | "bank_transfer" | "momo" | "vnpay";

export type InternalPaymentStatus =
  | "unpaid"
  | "awaiting_payment"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type PaymentWebhookInput = {
  orderId: string;
  provider: Extract<PaymentProvider, "momo" | "vnpay">;
  providerRef: string;
  providerStatus: string;
  amount: number;
  rawPayload: Record<string, unknown>;
};
