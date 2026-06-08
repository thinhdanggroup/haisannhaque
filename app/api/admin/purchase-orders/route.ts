import { NextResponse, type NextRequest } from "next/server";
import {
  AdminAuthorizationError,
  createAdminErrorResponse,
  requireAdminPermission,
} from "@/src/features/admin/auth";
import { purchaseOrderSchema } from "@/src/features/procurement/schema";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "purchase_orders:read");

    const { data, error } = await client
      .from("purchase_orders")
      .select(
        "id, po_no, status, ordered_total, received_total, created_at, suppliers(name), warehouses(code)",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return createAdminErrorResponse(error);
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  const client = await createServerClient();

  try {
    const admin = await requireAdminPermission(client, "purchase_orders:update");
    const payload = purchaseOrderSchema.parse(await request.json());
    const { data, error } = await client.rpc("create_purchase_order", {
      purchase_order_payload: payload,
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
