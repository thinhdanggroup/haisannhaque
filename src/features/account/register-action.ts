"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createServerClient } from "@/src/lib/supabase/server";
import { ensureCustomerForUser, safeNextPath } from "./customer-link";
import { registerSchema } from "./register-schema";

export type RegisterState = { error: string } | null;

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const result = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Thông tin đăng ký không hợp lệ." };
  }

  const { fullName, phone, email, password } = result.data;
  const admin = createAdminClient();

  // Created server-side with the email already confirmed: the project's
  // default mailer only delivers to team addresses, so a confirmation email
  // would never reach customers and they could not log in.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (createError || !created.user) {
    if (createError?.code === "email_exists" || /already/i.test(createError?.message ?? "")) {
      return { error: "Email này đã được đăng ký. Vui lòng đăng nhập." };
    }
    if (createError?.code === "weak_password") {
      return { error: "Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác." };
    }
    console.error("registerAction: createUser failed", createError);
    return { error: "Không thể tạo tài khoản. Vui lòng thử lại." };
  }

  try {
    await ensureCustomerForUser(admin, created.user);
  } catch (error) {
    console.error("registerAction: customer row failed", error);
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Không thể tạo tài khoản. Vui lòng thử lại." };
  }

  const client = await createServerClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });

  if (signInError) {
    redirect("/login");
  }

  redirect(safeNextPath(formData.get("next"), "/account/loyalty"));
}

