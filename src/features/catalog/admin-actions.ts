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
  description: z.string(),
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
    description: formData.get("description"),
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
      description: result.data.description,
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

export type RelatedProductState = { error: string } | null;

export async function addRelatedProduct(
  _prev: RelatedProductState,
  formData: FormData,
): Promise<RelatedProductState> {
  const schema = z.object({
    productId: z.string().uuid(),
    relatedProductId: z.string().uuid(),
  });

  const result = schema.safeParse({
    productId: formData.get("productId"),
    relatedProductId: formData.get("relatedProductId"),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  if (result.data.productId === result.data.relatedProductId) {
    return { error: "A product cannot be related to itself." };
  }

  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const { error } = await client.from("product_related" as never).upsert(
    {
      product_id: result.data.productId,
      related_product_id: result.data.relatedProductId,
    },
    { onConflict: "product_id,related_product_id" },
  );

  if (error) return { error: error.message };

  revalidatePath(`/admin/products/${result.data.productId}/edit`);
  return null;
}

export async function removeRelatedProduct(
  productId: string,
  relatedProductId: string,
): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const { error } = await client
    .from("product_related" as never)
    .delete()
    .eq("product_id", productId)
    .eq("related_product_id", relatedProductId);

  if (error) return;

  revalidatePath(`/admin/products/${productId}/edit`);
}

export async function searchProductsForRelated(
  productId: string,
  query: string,
): Promise<Array<{ id: string; name: string; slug: string }>> {
  if (!query.trim()) return [];

  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const { data, error } = await client
    .from("products")
    .select("id, name, slug")
    .neq("id", productId)
    .ilike("name", `%${query}%`)
    .in("status", ["published", "draft"])
    .order("name")
    .limit(10);

  if (error) throw error;

  return data ?? [];
}

export type UpdateVariantPricingState = { error: string } | { success: true } | null;

export async function updateVariantPricing(
  _prev: UpdateVariantPricingState,
  formData: FormData,
): Promise<UpdateVariantPricingState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const productId = formData.get("productId");
  const variantIds = formData.getAll("variantId") as string[];

  const productIdResult = z.string().uuid().safeParse(productId);
  if (!productIdResult.success) return { error: "Invalid product ID." };

  const variantSchema = z.object({
    id: z.string().uuid(),
    listPrice: z.coerce.number().min(0, "List price must be 0 or more"),
    salePrice: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  });

  const updates = variantIds.map((id) => {
    const saleRaw = formData.get(`salePrice_${id}`);
    return variantSchema.safeParse({
      id,
      listPrice: formData.get(`listPrice_${id}`),
      salePrice: saleRaw === "" ? "" : saleRaw,
    });
  });

  const failed = updates.find((r) => !r.success);
  if (failed && !failed.success) {
    return { error: failed.error.issues[0]?.message ?? "Invalid price." };
  }

  for (const result of updates) {
    if (!result.success) continue;
    const { id, listPrice, salePrice } = result.data;
    const salePriceValue =
      salePrice === "" || salePrice === undefined ? null : salePrice;

    const { error } = await client
      .from("product_variants")
      .update({ list_price: listPrice, sale_price: salePriceValue })
      .eq("id", id);

    if (error) throw error;
  }

  revalidatePath(`/admin/products/${productIdResult.data}/edit`);
  return { success: true };
}
