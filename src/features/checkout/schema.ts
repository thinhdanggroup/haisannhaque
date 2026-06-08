import { z } from "zod";

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  receiverName: z.string().min(2),
  phone: z.string().min(8),
  province: z.string().min(1),
  district: z.string().min(1),
  ward: z.string().min(1),
  addressLine: z.string().min(3),
  paymentMethod: z.enum(["cod", "bank_transfer", "momo", "vnpay"]),
  deliveryMethod: z.enum(["local_delivery", "branch_pickup", "nationwide_shipping"]),
  couponCode: z.string().optional(),
  orderNote: z.string().optional(),
  idempotencyKey: z.string().min(8),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CheckoutOrderResult = {
  orderId: string;
  orderNo: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: CheckoutInput["paymentMethod"];
  nextStep: "confirmation" | "payment";
};
