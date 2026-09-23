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

const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["draft", "published"]),
  shortDescription: z.string(),
  description: z.string(),
  origin: z.string(),
  temperatureClass: z.enum(["live", "fresh", "chilled", "frozen", "ready"]),
});

export type CreateProductState = { error: string } | null;

export async function createProduct(
  _prev: CreateProductState,
  formData: FormData,
): Promise<CreateProductState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const result = createProductSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    origin: formData.get("origin") ?? "",
    temperatureClass: formData.get("temperatureClass"),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const baseSlug = result.data.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await client
    .from("products")
    .insert({
      name: result.data.name,
      slug,
      status: result.data.status,
      short_description: result.data.shortDescription,
      description: result.data.description,
      origin: result.data.origin,
      temperature_class: result.data.temperatureClass,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A product with a similar name already exists. Please use a more specific name." };
    }
    throw error;
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}/edit`);
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

export type CategoryAssignmentState = { error: string } | null;

export async function addProductCategory(
  _prev: CategoryAssignmentState,
  formData: FormData,
): Promise<CategoryAssignmentState> {
  const schema = z.object({
    productId: z.string().uuid(),
    categoryId: z.string().uuid(),
  });

  const result = schema.safeParse({
    productId: formData.get("productId"),
    categoryId: formData.get("categoryId"),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input." };
  }

  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const { error } = await client
    .from("product_categories")
    .upsert(
      { product_id: result.data.productId, category_id: result.data.categoryId },
      { onConflict: "product_id,category_id" },
    );

  if (error) return { error: error.message };

  revalidatePath(`/admin/products/${result.data.productId}/edit`);
  return null;
}

export async function removeProductCategory(
  productId: string,
  categoryId: string,
): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const { error } = await client
    .from("product_categories")
    .delete()
    .eq("product_id", productId)
    .eq("category_id", categoryId);

  if (error) return;

  revalidatePath(`/admin/products/${productId}/edit`);
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

  // Same empty-string trap as createVariantSchema: Number("") is 0, so a
  // cleared sale price used to be stored as a 0d sale rather than as "no
  // sale", and a blank list price as a free product.
  const variantSchema = z.object({
    id: z.string().uuid(),
    listPrice: z
      .string()
      .trim()
      .min(1, "List price is required")
      .transform((value) => Number(value))
      .pipe(
        z
          .number({ message: "List price must be a number" })
          .min(0, "List price must be 0 or more"),
      ),
    salePrice: z
      .string()
      .trim()
      .refine((value) => value === "" || Number.isFinite(Number(value)), "Sale price must be a number")
      .refine((value) => value === "" || Number(value) >= 0, "Sale price must be 0 or more")
      .transform((value) => (value === "" ? null : Number(value))),
  });

  const updates = variantIds.map((id) => {
    return variantSchema.safeParse({
      id,
      listPrice: formData.get(`listPrice_${id}`) ?? "",
      salePrice: formData.get(`salePrice_${id}`) ?? "",
    });
  });

  const failed = updates.find((r) => !r.success);
  if (failed && !failed.success) {
    return { error: failed.error.issues[0]?.message ?? "Invalid price." };
  }

  for (const result of updates) {
    if (!result.success) continue;
    const { id, listPrice, salePrice } = result.data;

    const { error } = await client
      .from("product_variants")
      .update({ list_price: listPrice, sale_price: salePrice })
      .eq("id", id);

    if (error) throw error;
  }

  revalidatePath(`/admin/products/${productIdResult.data}/edit`);
  return { success: true };
}

export type DeleteVariantState = { error: string } | { success: true };

// Variants are referenced by order items, stock movements and purchase
// orders, so "delete" is a soft delete: the storefront, cart and checkout
// already ignore inactive variants, and order history keeps its SKU.
export async function deleteProductVariant(
  productId: string,
  variantId: string,
): Promise<DeleteVariantState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const ids = z.object({ productId: z.string().uuid(), variantId: z.string().uuid() });
  const parsed = ids.safeParse({ productId, variantId });
  if (!parsed.success) return { error: "Invalid variant ID." };

  const { error } = await client
    .from("product_variants")
    .update({ is_active: false })
    .eq("id", parsed.data.variantId)
    .eq("product_id", parsed.data.productId);

  if (error) return { error: "Không xóa được biến thể. Vui lòng thử lại." };

  revalidatePath(`/admin/products/${parsed.data.productId}/edit`);
  revalidatePath("/admin/products");
  return { success: true };
}

// Number("") is 0, so coercing a blank price would silently make the product
// free. Both money fields handle the empty string explicitly: list price
// rejects it, sale price maps it to null ("no sale price").
const createVariantSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string(),
  unit: z.string().trim().min(1, "Unit is required"),
  optionSummary: z.string(),
  listPrice: z
    .string()
    .trim()
    .min(1, "List price is required")
    .transform((value) => Number(value))
    .pipe(
      z
        .number({ message: "List price must be a number" })
        .min(0, "List price must be 0 or more"),
    ),
  salePrice: z
    .string()
    .trim()
    .refine((value) => value === "" || Number.isFinite(Number(value)), "Sale price must be a number")
    .refine((value) => value === "" || Number(value) >= 0, "Sale price must be 0 or more")
    .transform((value) => (value === "" ? null : Number(value))),
});

export type CreateVariantState = { error: string } | { success: true } | null;

export async function createProductVariant(
  _prev: CreateVariantState,
  formData: FormData,
): Promise<CreateVariantState> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const result = createVariantSchema.safeParse({
    productId: formData.get("productId"),
    sku: formData.get("sku") ?? "",
    unit: formData.get("unit") ?? "",
    optionSummary: formData.get("optionSummary") ?? "",
    listPrice: formData.get("listPrice") ?? "",
    salePrice: formData.get("salePrice") ?? "",
  });

  if (!result.success) {
    const issue = result.error.issues[0];
    if (issue?.path[0] === "productId") return { error: "Invalid product ID." };
    return { error: issue?.message ?? "Invalid input." };
  }

  const { productId, unit, optionSummary, listPrice, salePrice } = result.data;

  // The admin create-product form makes a product with no variants, so prices
  // live nowhere until one is added here. SKU is globally unique and rarely
  // meaningful for hand-made products, so a blank one is derived from the
  // product slug rather than forced on the operator.
  let sku = result.data.sku.trim();
  if (sku.length === 0) {
    const { data, error } = await client
      .from("products")
      .select("slug")
      .eq("id", productId)
      .single();

    if (error || !data) return { error: "Product not found." };
    sku = `${data.slug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const { error } = await client.from("product_variants").insert({
    product_id: productId,
    sku,
    unit,
    option_summary: optionSummary.trim() === "" ? null : optionSummary.trim(),
    list_price: listPrice,
    sale_price: salePrice,
    is_active: true,
    is_weighable: false,
  });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { error: `SKU "${sku}" is already used by another variant.` };
    }
    throw error;
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  return { success: true };
}
