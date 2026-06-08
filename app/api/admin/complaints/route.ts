import { NextResponse, type NextRequest } from "next/server";
import {
  AdminAuthorizationError,
  createAdminErrorResponse,
  requireAdminPermission,
} from "@/src/features/admin/auth";
import { complaintCaseSchema } from "@/src/features/complaints/schema";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "complaints:read");

    const { data, error } = await client
      .from("complaint_cases")
      .select("id, status, reason, resolution, created_at, orders(order_no), customers(full_name)")
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
    const admin = await requireAdminPermission(client, "complaints:update");
    const payload = complaintCaseSchema.parse(await request.json());
    const { data, error } = await client.rpc("create_complaint_case", {
      complaint_payload: payload,
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
