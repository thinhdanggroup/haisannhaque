import { NextResponse, type NextRequest } from "next/server";
import { handlePaymentWebhook, verifyWebhookSignature } from "@/src/features/payments/webhook";
import { createServerClient } from "@/src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const signature = request.headers.get("x-momo-signature") ?? String(payload.signature ?? "");
  const secret = process.env.MOMO_WEBHOOK_SECRET;

  if (secret && !verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const client = await createServerClient();
  const status = await handlePaymentWebhook(client, {
    orderId: String(payload.orderId),
    provider: "momo",
    providerRef: String(payload.transId ?? payload.requestId),
    providerStatus: String(payload.resultCode),
    amount: Number(payload.amount ?? 0),
    rawPayload: payload,
  });

  return NextResponse.json({ status });
}
