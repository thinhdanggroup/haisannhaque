import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên.").max(100),
    phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s.-]/g, ""))
      .pipe(z.string().regex(/^(\+84|0)\d{9,10}$/, "Số điện thoại không hợp lệ.")),
    email: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ.")),
    password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp.",
    path: ["confirmPassword"],
  });
