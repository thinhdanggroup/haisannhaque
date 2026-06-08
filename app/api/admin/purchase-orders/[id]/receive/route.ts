import { NextResponse, type NextRequest } from "next/server";
import {
  AdminAuthorizationError,
  createAdminErrorResponse,
  requireAdminPermission,
} from "@/src/features/admin/auth";
import { purchaseOrderReceiptSchema } from "@/src/features/procurement/schema";
import { createServerClient } from "@/src/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const client = await createServerClient();

  try {
    const admin = await requireAdminPermission(client, "purchase_orders:update");
    const payload = purchaseOrderReceiptSchema.parse(await request.json());
    const { data, error } = await client.rpc("receive_purchase_order", {
      input_purchase_order_id: id,
      receipt_payload: payload,
      input_actor_id: admin.userId,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return createAdminErrorResponse(error);
    }

    throw error;
  }
}
