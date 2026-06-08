import { NextResponse, type NextRequest } from "next/server";
import {
  AdminAuthorizationError,
  createAdminErrorResponse,
  requireAdminPermission,
} from "@/src/features/admin/auth";
import { refundSchema } from "@/src/features/refunds/schema";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "payments:read");

    const { data, error } = await client
      .from("refunds")
      .select("id, order_id, amount, refund_method, status, reason, created_at, orders(order_no)")
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
    const admin = await requireAdminPermission(client, "refunds:create");
    const payload = refundSchema.parse(await request.json());
    const { data, error } = await client.rpc("create_refund", {
      refund_payload: payload,
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
