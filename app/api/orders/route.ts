import { NextResponse, type NextRequest } from "next/server";
import { createOrderFromCheckout } from "@/src/features/checkout/create-order";
import { checkoutSchema } from "@/src/features/checkout/schema";
import { createServerClient } from "@/src/lib/supabase/server";

export const preferredRegion = "sin1";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = checkoutSchema.parse(body);
  const client = await createServerClient();
  const order = await createOrderFromCheckout(client, payload);

  return NextResponse.json(order, { status: 201 });
}
