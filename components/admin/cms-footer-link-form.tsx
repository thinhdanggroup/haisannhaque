"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsFooterLinkState } from "@/src/features/cms/admin-actions";

type InitialValues = {
  id: string;
  groupLabel: string;
  label: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsFooterLinkFormProps = {
  action: (prev: CmsFooterLinkState, formData: FormData) => Promise<CmsFooterLinkState>;
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CmsFooterLinkForm({ action, initialValues }: CmsFooterLinkFormProps) {
  const [state, formAction, isPending] = useActionState<CmsFooterLinkState, FormData>(
    action,
    null,
  );
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="groupLabel">
        <span className="font-medium text-slate-700">Nhóm</span>
        <input
          id="groupLabel"
          name="groupLabel"
          required
          defaultValue={initialValues?.groupLabel}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="label">
        <span className="font-medium text-slate-700">Nhãn</span>
        <input
          id="label"
          name="label"
          required
          defaultValue={initialValues?.label}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="href">
        <span className="font-medium text-slate-700">Đường dẫn</span>
        <input
          id="href"
          name="href"
          required
          defaultValue={initialValues?.href}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sortOrder">
        <span className="font-medium text-slate-700">Thứ tự</span>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues?.sortOrder ?? 0}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues ? String(initialValues.isActive) : "true"}
          className={INPUT_CLASS}
        >
          <option value="true">Hoạt động</option>
          <option value="false">Không hoạt động</option>
        </select>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : isEdit ? "Lưu" : "Tạo liên kết"}
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
