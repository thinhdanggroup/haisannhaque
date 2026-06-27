import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

export const preferredRegion = "sin1";

const paymentIntentSchema = z.object({
  orderId: z.string().uuid(),
  paymentMethod: z.enum(["cod", "bank_transfer", "momo", "vnpay"]),
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  const payload = paymentIntentSchema.parse(await request.json());
  const client = await createServerClient();

  const { data, error } = await client
    .from("payments")
    .insert({
      order_id: payload.orderId,
      provider: payload.paymentMethod,
      provider_ref: `${payload.paymentMethod}-${crypto.randomUUID()}`,
      payment_method: payload.paymentMethod,
      status: payload.paymentMethod === "cod" ? "unpaid" : "awaiting_payment",
      amount: payload.amount,
    })
    .select("id, provider_ref")
    .single();

  if (error) {
    throw error;
  }

  return NextResponse.json({
    paymentId: data.id,
    providerRef: data.provider_ref,
    redirectUrl:
      payload.paymentMethod === "momo" || payload.paymentMethod === "vnpay"
        ? `/checkout/payment/${data.provider_ref}`
        : null,
  });
}
