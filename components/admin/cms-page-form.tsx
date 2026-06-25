"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsPageState } from "@/src/features/cms/admin-actions";

type CmsPageFormProps = {
  action: (prev: CmsPageState, formData: FormData) => Promise<CmsPageState>;
  initialValues?: { pageKey: string; title: string; status: string };
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CmsPageForm({ action, initialValues }: CmsPageFormProps) {
  const [state, formAction, isPending] = useActionState<CmsPageState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="pageKey" value={initialValues!.pageKey} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {!isEdit && (
        <label className="block text-sm" htmlFor="pageKey">
          <span className="font-medium text-slate-700">Khóa trang</span>
          <span className="ml-1 text-xs text-slate-400">(chữ thường, chỉ gạch ngang — vd home)</span>
          <input
            id="pageKey"
            name="pageKey"
            required
            placeholder="home"
            className={INPUT_CLASS}
          />
        </label>
      )}

      <label className="block text-sm" htmlFor="title">
        <span className="font-medium text-slate-700">Tiêu đề</span>
        <input
          id="title"
          name="title"
          required
          defaultValue={initialValues?.title}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="status"
          name="status"
          defaultValue={initialValues?.status ?? "draft"}
          className={INPUT_CLASS}
        >
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
          <option value="archived">Đã lưu trữ</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : isEdit ? "Lưu" : "Tạo trang"}
        </button>
        <Link
          href="/admin/content"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
