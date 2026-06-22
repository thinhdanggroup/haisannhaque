"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type SupplierState = { error: string } | null;

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  taxCode: z.string(),
  isActive: z.boolean(),
});

const supplierUpdateSchema = supplierSchema.extend({ id: z.string().uuid() });

export function validateSupplierInput(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    taxCode: formData.get("taxCode") ?? "",
    isActive: formData.get("isActive") === "true",
  });
}

export function validateSupplierUpdateInput(formData: FormData) {
  return supplierUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    taxCode: formData.get("taxCode") ?? "",
    isActive: formData.get("isActive") === "true",
  });
}

export async function createSupplier(
  _prev: SupplierState,
  formData: FormData,
): Promise<SupplierState> {
  const result = validateSupplierInput(formData);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "suppliers:update");

  const { error } = await client.from("suppliers").insert({
    name: result.data.name,
    contact_name: result.data.contactName || null,
    phone: result.data.phone || null,
    email: result.data.email || null,
    address: result.data.address || null,
    tax_code: result.data.taxCode || null,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A supplier with this name already exists." };
    throw error;
  }

  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers");
}

export async function updateSupplier(
  _prev: SupplierState,
  formData: FormData,
): Promise<SupplierState> {
  const result = validateSupplierUpdateInput(formData);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "suppliers:update");

  const { error } = await client
    .from("suppliers")
    .update({
      name: result.data.name,
      contact_name: result.data.contactName || null,
      phone: result.data.phone || null,
      email: result.data.email || null,
      address: result.data.address || null,
      tax_code: result.data.taxCode || null,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers");
}

export async function deleteSupplier(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid supplier id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "suppliers:update");

  const { error } = await client.from("suppliers").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/suppliers");
}
