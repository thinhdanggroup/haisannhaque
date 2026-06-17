import type { Metadata } from "next";
import { LoginForm } from "@/components/storefront/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập – Dao Seafood",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
          Đăng nhập
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
