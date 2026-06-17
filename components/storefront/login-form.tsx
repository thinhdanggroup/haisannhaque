"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/src/features/account/login-action";

export function LoginForm() {
  const [state, action, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="email">
        <span className="font-medium text-slate-700">Email</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="password">
        <span className="font-medium text-slate-700">Mật khẩu</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-full rounded-lg bg-[#0f766e] px-4 text-sm font-semibold text-white transition hover:bg-[#0f665f] disabled:opacity-60"
      >
        {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-teal-700 hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
