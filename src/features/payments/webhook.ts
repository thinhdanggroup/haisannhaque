import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InternalPaymentStatus,
  PaymentProvider,
  PaymentWebhookInput,
} from "./types";

export function normalizePaymentStatus(
  provider: PaymentProvider,
  providerStatus: string,
): InternalPaymentStatus {
  if (provider === "momo" && providerStatus === "0") {
    return "paid";
  }

  if (provider === "vnpay" && providerStatus === "00") {
    return "paid";
  }

  return "failed";
}

export function verifyWebhookSignature(rawPayload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function handlePaymentWebhook(
  client: SupabaseClient,
  input: PaymentWebhookInput,
): Promise<InternalPaymentStatus> {
  const status = normalizePaymentStatus(input.provider, input.providerStatus);

  const { error: paymentError } = await client.from("payments").upsert(
    {
      order_id: input.orderId,
      provider: input.provider,
      provider_ref: input.providerRef,
      payment_method: input.provider,
      status,
      amount: input.amount,
      raw_payload: input.rawPayload,
    },
    {
      onConflict: "provider,provider_ref",
    },
  );

  if (paymentError) {
    throw paymentError;
  }

  const orderPatch =
    status === "paid"
      ? { payment_status: "paid", order_status: "pending_confirmation" }
      : { payment_status: "failed", order_status: "payment_failed" };

  const { error: orderError } = await client.from("orders").update(orderPatch).eq("id", input.orderId);

  if (orderError) {
    throw orderError;
  }

  await client.from("audit_logs").insert({
    action: "payment_webhook_processed",
    entity_type: "orders",
    entity_id: input.orderId,
    metadata: {
      provider: input.provider,
      providerRef: input.providerRef,
      status,
    },
  });

  return status;
}
