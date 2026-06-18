import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  AdminAuthorizationError,
  createAdminErrorResponse,
  requireAdminPermission,
} from "@/src/features/admin/auth";
import { canTransitionOrder, type OrderStatus } from "@/src/features/orders/status";
import { createServerClient } from "@/src/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const transitionSchema = z.object({
  nextStatus: z.enum([
    "draft_checkout",
    "awaiting_payment",
    "payment_failed",
    "pending_confirmation",
    "confirmed",
    "picking",
    "packed",
    "dispatched",
    "delivery_attempted",
    "delivered",
    "completed",
    "cancelled",
    "returned",
    "partially_returned",
    "refunded",
  ]),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const client = await createServerClient();

  try {
    const parseResult = transitionSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message },
        { status: 400 },
      );
    }
    const payload = parseResult.data;

    const admin = await requireAdminPermission(client, "orders:update");
    const { data: order, error: readError } = await client
      .from("orders")
      .select("order_status")
      .eq("id", id)
      .single();

    if (readError) {
      throw readError;
    }

    const currentStatus = order.order_status as OrderStatus;

    if (!canTransitionOrder(currentStatus, payload.nextStatus)) {
      return NextResponse.json({ error: "Invalid order transition" }, { status: 422 });
    }

    const { data, error } = await client.rpc("transition_order_status", {
      input_order_id: id,
      input_next_status: payload.nextStatus,
      input_actor_id: admin.userId,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return createAdminErrorResponse(error);
    }

    throw error;
  }
}
