import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkoutSchema,
  type CheckoutInput,
  type CheckoutOrderResult,
} from "./schema";

type CreateOrderRpcResult = {
  order_id: string;
  order_no: string;
  order_status: string;
  payment_status: string;
  payment_method: CheckoutInput["paymentMethod"];
  next_step: "confirmation" | "payment";
};

export async function createOrderFromCheckout(
  client: SupabaseClient,
  input: CheckoutInput,
): Promise<CheckoutOrderResult> {
  const payload = checkoutSchema.parse(input);

  const { data, error } = await client.rpc("create_order_from_checkout", {
    checkout_payload: payload,
    input_idempotency_key: payload.idempotencyKey,
  });

  if (error) {
    throw error;
  }

  const result = data as CreateOrderRpcResult;

  return {
    orderId: result.order_id,
    orderNo: result.order_no,
    orderStatus: result.order_status,
    paymentStatus: result.payment_status,
    paymentMethod: result.payment_method,
    nextStep: result.next_step,
  };
}
