import { NextResponse, type NextRequest } from "next/server";
import { handlePaymentWebhook, verifyWebhookSignature } from "@/src/features/payments/webhook";
import { createServerClient } from "@/src/lib/supabase/server";

export const preferredRegion = "sin1";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const signature = request.headers.get("x-vnpay-signature") ?? String(payload.vnp_SecureHash ?? "");
  const secret = process.env.VNPAY_WEBHOOK_SECRET;

  if (secret && !verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const client = await createServerClient();
  const status = await handlePaymentWebhook(client, {
    orderId: String(payload.orderId ?? payload.vnp_TxnRef),
    provider: "vnpay",
    providerRef: String(payload.vnp_TransactionNo ?? payload.vnp_TxnRef),
    providerStatus: String(payload.vnp_ResponseCode),
    amount: Number(payload.vnp_Amount ?? 0),
    rawPayload: payload,
  });

  return NextResponse.json({ status });
}
