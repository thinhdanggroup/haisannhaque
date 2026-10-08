"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterState } from "@/src/features/account/register-action";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, isPending] = useActionState<RegisterState, FormData>(
    registerAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="fullName">
        <span className="font-medium text-slate-700">Họ và tên</span>
        <input id="fullName" name="fullName" autoComplete="name" required minLength={2} className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="phone">
        <span className="font-medium text-slate-700">Số điện thoại</span>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="email">
        <span className="font-medium text-slate-700">Email</span>
        <input id="email" name="email" type="email" autoComplete="email" required className={INPUT_CLASS} />
      </label>

      <label className="block text-sm" htmlFor="password">
        <span className="font-medium text-slate-700">Mật khẩu</span>
        <span className="ml-1 text-xs text-slate-400">(ít nhất 8 ký tự)</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="confirmPassword">
        <span className="font-medium text-slate-700">Nhập lại mật khẩu</span>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={INPUT_CLASS}
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-full rounded-lg bg-[#0f766e] px-4 text-sm font-semibold text-white transition hover:bg-[#0f665f] disabled:opacity-60"
      >
        {isPending ? "Đang tạo tài khoản…" : "Đăng ký"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-teal-700 hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
