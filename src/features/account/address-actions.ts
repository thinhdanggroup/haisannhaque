"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const addressSchema = z.object({
  customerId: z.string().uuid(),
  label: z.string().optional(),
  receiverName: z.string().min(1, "Vui lòng nhập tên người nhận"),
  phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
  province: z.string().min(1, "Vui lòng nhập tỉnh/thành"),
  district: z.string().min(1, "Vui lòng nhập quận/huyện"),
  ward: z.string().min(1, "Vui lòng nhập phường/xã"),
  addressLine: z.string().min(1, "Vui lòng nhập địa chỉ"),
  isDefault: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
});

export type AddressActionState = { error: string } | { success: true } | null;

export async function addAddressAction(
  _prev: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const result = addressSchema.safeParse({
    customerId: formData.get("customerId"),
    label: formData.get("label") || undefined,
    receiverName: formData.get("receiverName"),
    phone: formData.get("phone"),
    province: formData.get("province"),
    district: formData.get("district"),
    ward: formData.get("ward"),
    addressLine: formData.get("addressLine"),
    isDefault: formData.get("isDefault"),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const client = await createServerClient();

  if (result.data.isDefault) {
    const { error: unsetError } = await client
      .from("addresses")
      .update({ is_default: false })
      .eq("customer_id", result.data.customerId);

    if (unsetError) return { error: "Không thể cập nhật địa chỉ mặc định. Vui lòng thử lại." };
  }

  const { error } = await client.from("addresses").insert({
    customer_id: result.data.customerId,
    label: result.data.label ?? null,
    receiver_name: result.data.receiverName,
    phone: result.data.phone,
    province: result.data.province,
    district: result.data.district,
    ward: result.data.ward,
    address_line: result.data.addressLine,
    is_default: result.data.isDefault,
  });

  if (error) return { error: "Không thể thêm địa chỉ. Vui lòng thử lại." };

  revalidatePath("/account/addresses");
  return { success: true };
}

export async function deleteAddressAction(addressId: string): Promise<void> {
  const client = await createServerClient();
  const { error } = await client.from("addresses").delete().eq("id", addressId);
  if (error) throw error;
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(
  addressId: string,
  customerId: string,
): Promise<void> {
  const client = await createServerClient();

  const { error: unsetError } = await client
    .from("addresses")
    .update({ is_default: false })
    .eq("customer_id", customerId);

  if (unsetError) throw unsetError;

  const { error } = await client
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId);

  if (error) throw error;
  revalidatePath("/account/addresses");
}
