"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().min(1, "Vui lòng nhập họ tên"),
  phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
});

export type ProfileActionState = { error: string } | { success: true } | null;

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const result = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const client = await createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập hết hạn." };

  const { error } = await client
    .from("profiles")
    .update({ full_name: result.data.fullName, phone: result.data.phone })
    .eq("id", user.id);

  if (error) return { error: "Không thể lưu thông tin. Vui lòng thử lại." };

  revalidatePath("/account");
  return { success: true };
}
