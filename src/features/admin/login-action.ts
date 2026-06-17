"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type AdminLoginState = { error: string } | null;

export async function adminLoginAction(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: "Email hoặc mật khẩu không hợp lệ." };
  }

  const client = await createServerClient();
  const { error } = await client.auth.signInWithPassword(result.data);

  if (error) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  redirect("/admin");
}
