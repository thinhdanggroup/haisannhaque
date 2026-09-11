"use client";

import { useActionState } from "react";
import type { SocialPostActionState } from "@/src/features/social-posts/admin-actions";

type InitialValues = {
  id?: string;
  name: string;
  promptBody: string;
  isDefault: boolean;
  isActive: boolean;
};

type SocialPostTemplateFormProps = {
  action: (prev: SocialPostActionState, formData: FormData) => Promise<SocialPostActionState>;
  initialValues: InitialValues;
  submitLabel: string;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function SocialPostTemplateForm({
  action,
  initialValues,
  submitLabel,
}: SocialPostTemplateFormProps) {
  const [state, formAction, isPending] = useActionState<SocialPostActionState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {initialValues.id && <input type="hidden" name="templateId" value={initialValues.id} />}

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Tên mẫu</span>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialValues.name}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="promptBody">
        <span className="font-medium text-slate-700">Nội dung prompt</span>
        <textarea
          id="promptBody"
          name="promptBody"
          required
          rows={10}
          defaultValue={initialValues.promptBody}
          className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <p className="text-xs text-slate-500">
        Không cần thêm hướng dẫn về định dạng đầu ra hay về việc đọc ảnh — hệ thống tự thêm phần đó
        vào prompt để khớp với bộ phân tích kết quả.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDefault" defaultChecked={initialValues.isDefault} />
        <span className="font-medium text-slate-700">Đặt làm mẫu mặc định</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={initialValues.isActive} />
        <span className="font-medium text-slate-700">Đang sử dụng</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Đang lưu…" : submitLabel}
      </button>
    </form>
  );
}
