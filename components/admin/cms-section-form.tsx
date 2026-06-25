"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsSectionState } from "@/src/features/cms/admin-actions";

type PageOption = { pageKey: string; title: string };

type InitialValues = {
  id: string;
  pageKey: string;
  sectionKey: string;
  sectionType: string;
  title: string;
  subtitle: string;
  layout: string;
  sortOrder: number;
  isActive: boolean;
};

type CmsSectionFormProps = {
  action: (prev: CmsSectionState, formData: FormData) => Promise<CmsSectionState>;
  pages: PageOption[];
  initialValues?: InitialValues;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const SECTION_TYPES = [
  "hero",
  "service_strip",
  "category_shortcuts",
  "product_rail",
  "flash_sale",
  "promo_band",
  "recommendation_tabs",
  "partner_strip",
  "content_highlights",
  "footer",
] as const;

export function CmsSectionForm({ action, pages, initialValues }: CmsSectionFormProps) {
  const [state, formAction, isPending] = useActionState<CmsSectionState, FormData>(action, null);
  const isEdit = Boolean(initialValues);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {!isEdit && (
        <label className="block text-sm" htmlFor="pageKey">
          <span className="font-medium text-slate-700">Trang</span>
          <select id="pageKey" name="pageKey" required className={INPUT_CLASS}>
            <option value="">Chọn trang…</option>
            {pages.map((p) => (
              <option key={p.pageKey} value={p.pageKey}>
                {p.title} ({p.pageKey})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm" htmlFor="sectionKey">
        <span className="font-medium text-slate-700">Khóa phần</span>
        <span className="ml-1 text-xs text-slate-400">(chữ thường, chỉ gạch ngang)</span>
        <input
          id="sectionKey"
          name="sectionKey"
          required
          defaultValue={initialValues?.sectionKey}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="sectionType">
        <span className="font-medium text-slate-700">Loại phần</span>
        <select
          id="sectionType"
          name="sectionType"
          defaultValue={initialValues?.sectionType ?? "product_rail"}
          className={INPUT_CLASS}
        >
          {SECTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="title">
        <span className="font-medium text-slate-700">Tiêu đề (tuỳ chọn)</span>
        <input
          id="title"
          name="title"
          defaultValue={initialValues?.title}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="subtitle">
        <span className="font-medium text-slate-700">Phụ đề (tuỳ chọn)</span>
        <input
          id="subtitle"
          name="subtitle"
          defaultValue={initialValues?.subtitle}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="layout">
        <span className="font-medium text-slate-700">Bố cục</span>
        <input
          id="layout"
          name="layout"
          defaultValue={initialValues?.layout ?? "default"}
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
          {isPending ? "Đang lưu…" : isEdit ? "Lưu" : "Tạo phần"}
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
