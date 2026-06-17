"use client";

import { useActionState } from "react";
import { adminLoginAction, type AdminLoginState } from "@/src/features/admin/login-action";

export function AdminLoginForm() {
  const [state, action, isPending] = useActionState<AdminLoginState, FormData>(
    adminLoginAction,
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
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
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
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
