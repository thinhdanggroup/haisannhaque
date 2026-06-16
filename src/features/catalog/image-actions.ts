"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type AddImageState = { error: string } | null;

export async function addProductImage(
  _prev: AddImageState,
  formData: FormData,
): Promise<AddImageState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const result = z
    .object({
      productId: z.string().uuid(),
      url: z.string().url("Please enter a valid URL"),
      altText: z.string(),
    })
    .safeParse({
      productId: formData.get("productId"),
      url: formData.get("url"),
      altText: formData.get("altText") ?? "",
    });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error } = await client.from("product_images").insert({
    product_id: result.data.productId,
    url: result.data.url,
    alt_text: result.data.altText || null,
    sort_order: 0,
  });

  if (error) throw error;

  revalidatePath(`/admin/products/${result.data.productId}/edit`);
  return null;
}

export async function removeProductImage(imageId: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(imageId);
  if (!parsed.success) throw new Error("Invalid image id");

  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const { error } = await client
    .from("product_images")
    .delete()
    .eq("id", parsed.data);

  if (error) throw error;

  revalidatePath("/admin/products");
}
