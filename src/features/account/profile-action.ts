"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
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
    return { error: result.error.issues[0].message };
  }

  const client = await createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập hết hạn." };

  const { error } = await client
    .from("profiles")
    .upsert({ id: user.id, full_name: result.data.fullName, phone: result.data.phone });

  if (error) return { error: "Không thể lưu thông tin. Vui lòng thử lại." };

  revalidatePath("/account");
  return { success: true };
}
