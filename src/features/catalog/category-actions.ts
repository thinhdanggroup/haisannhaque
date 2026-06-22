"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type CategoryState = { error: string } | null;

const categorySchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and hyphens only"),
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  imageUrl: z.string(),
  parentId: z.string().uuid().nullable(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

// Update schema excludes slug (immutable after creation)
const categoryUpdateSchema = categorySchema
  .extend({ id: z.string().uuid() })
  .omit({ slug: true });

export function validateCategoryInput(formData: FormData) {
  return categorySchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    parentId: formData.get("parentId") && formData.get("parentId") !== "" ? formData.get("parentId") : null,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });
}

export function validateCategoryUpdateInput(formData: FormData) {
  return categoryUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    parentId: formData.get("parentId") && formData.get("parentId") !== "" ? formData.get("parentId") : null,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
  });
}

export async function createCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const result = validateCategoryInput(formData);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "categories:update");

  const { error } = await client.from("categories").insert({
    slug: result.data.slug,
    name: result.data.name,
    description: result.data.description || null,
    image_url: result.data.imageUrl || null,
    parent_id: result.data.parentId,
    sort_order: result.data.sortOrder,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A category with this slug already exists." };
    throw error;
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const result = validateCategoryUpdateInput(formData);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "categories:update");

  const { error } = await client
    .from("categories")
    .update({
      name: result.data.name,
      description: result.data.description || null,
      image_url: result.data.imageUrl || null,
      parent_id: result.data.parentId,
      sort_order: result.data.sortOrder,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategory(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid category id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "categories:update");

  const { error } = await client.from("categories").delete().eq("id", parsed.data);
  if (error) {
    if (error.code === "23503") throw new Error("Remove child categories before deleting this one.");
    throw error;
  }

  revalidatePath("/admin/categories");
}
