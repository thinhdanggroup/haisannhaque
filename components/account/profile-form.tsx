"use client";

import { useActionState } from "react";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/src/features/account/profile-action";

type ProfileFormProps = {
  defaultFullName: string | null;
  defaultPhone: string | null;
};

export function ProfileForm({ defaultFullName, defaultPhone }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <form action={action} className="space-y-4 max-w-sm">
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-green-600">Đã lưu thay đổi.</p>
      )}
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Họ và tên
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={defaultFullName ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Số điện thoại
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultPhone ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Đang lưu…" : "Lưu thay đổi"}
      </button>
    </form>
  );
}
