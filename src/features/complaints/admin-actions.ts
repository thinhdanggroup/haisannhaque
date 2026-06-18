"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const updateComplaintSchema = z.object({
  id: z.string().uuid("Invalid complaint ID"),
  status: z.enum(["open", "investigating", "resolved", "closed"]),
  resolution: z.string(),
});

export type ComplaintUpdateState = { error: string } | null;

export async function updateComplaintCase(
  _prev: ComplaintUpdateState,
  formData: FormData,
): Promise<ComplaintUpdateState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "complaints:update");

  const result = updateComplaintSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    resolution: formData.get("resolution") ?? "",
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error } = await client
    .from("complaint_cases")
    .update({
      status: result.data.status,
      resolution: result.data.resolution || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/complaints");
  revalidatePath("/admin/complaints/[id]", "page");
  return null;
}
