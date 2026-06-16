"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  status: z.enum(["draft", "published"]),
  shortDescription: z.string(),
  origin: z.string(),
});

export type UpdateProductState = { error: string } | null;

export async function updateProduct(
  _prev: UpdateProductState,
  formData: FormData,
): Promise<UpdateProductState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const result = updateProductSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    status: formData.get("status"),
    shortDescription: formData.get("shortDescription"),
    origin: formData.get("origin"),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error } = await client
    .from("products")
    .update({
      name: result.data.name,
      status: result.data.status,
      short_description: result.data.shortDescription,
      origin: result.data.origin,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function archiveProduct(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid product id");

  const client = await createServerClient();
  await requireAdminPermission(client, "products:delete");

  const { error } = await client
    .from("products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", parsed.data);

  if (error) throw error;

  revalidatePath("/admin/products");
}
