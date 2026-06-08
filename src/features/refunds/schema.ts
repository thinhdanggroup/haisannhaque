import { z } from "zod";

export const refundSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  amount: z.number().positive(),
  refundMethod: z.enum(["gateway", "bank_transfer", "voucher", "loyalty_points", "manual_finance"]),
  reason: z.string().min(3),
});

export type RefundInput = z.infer<typeof refundSchema>;
