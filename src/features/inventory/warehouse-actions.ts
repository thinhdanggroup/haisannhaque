"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type WarehouseState = { error: string } | null;

const warehouseSchema = z.object({
  code: z.string().min(1, "Code is required").regex(/^[A-Z0-9-]+$/, "Code must be uppercase letters, digits, and hyphens"),
  name: z.string().min(1, "Name is required"),
  address: z.string(),
  isActive: z.boolean(),
});

const warehouseUpdateSchema = warehouseSchema.extend({ id: z.string().uuid("Invalid warehouse id") });

export function validateWarehouseInput(formData: FormData) {
  return warehouseSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    isActive: formData.get("isActive") === "true",
  });
}

export function validateWarehouseUpdateInput(formData: FormData) {
  return warehouseUpdateSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    isActive: formData.get("isActive") === "true",
  });
}

export async function createWarehouse(
  _prev: WarehouseState,
  formData: FormData,
): Promise<WarehouseState> {
  const result = validateWarehouseInput(formData);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const { error } = await client.from("warehouses").insert({
    code: result.data.code,
    name: result.data.name,
    address: result.data.address || null,
    is_active: result.data.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A warehouse with this code already exists." };
    throw error;
  }

  revalidatePath("/admin/warehouses");
  redirect("/admin/warehouses");
}

export async function updateWarehouse(
  _prev: WarehouseState,
  formData: FormData,
): Promise<WarehouseState> {
  const result = validateWarehouseUpdateInput(formData);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const { error } = await client
    .from("warehouses")
    .update({
      code: result.data.code,
      name: result.data.name,
      address: result.data.address || null,
      is_active: result.data.isActive,
    })
    .eq("id", result.data.id);

  if (error) throw error;

  revalidatePath("/admin/warehouses");
  redirect("/admin/warehouses");
}

export async function deleteWarehouse(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid warehouse id.");

  const client = await createServerClient();
  await requireAdminPermission(client, "inventory:update");

  const { error } = await client.from("warehouses").delete().eq("id", parsed.data);
  if (error) throw error;

  revalidatePath("/admin/warehouses");
}
