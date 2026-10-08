import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/storefront/register-form";
import { safeNextPath } from "@/src/features/account/customer-link";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản – Hải Sản Nhà Quê",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next ? safeNextPath(next, "") || undefined : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-slate-900">Đăng ký tài khoản</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-500">
          Tích điểm cho mỗi đơn hàng hoàn thành: cứ 1.000đ được 1 điểm.
        </p>
        <RegisterForm next={safeNext} />
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">
            ← Về trang chủ
          </Link>
        </p>
      </div>
    </main>
  );
}
