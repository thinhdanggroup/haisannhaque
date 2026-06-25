import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata: Metadata = {
  title: "Admin – Đăng nhập",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Hải Sản Nhà Quê
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin</h1>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
