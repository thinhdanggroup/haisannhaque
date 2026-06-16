"use client";

import { useActionState } from "react";
import { updateProduct, type UpdateProductState } from "@/src/features/catalog/admin-actions";

type ProductEditFormProps = {
  id: string;
  name: string;
  status: string;
  shortDescription: string;
  origin: string;
};

export function ProductEditForm({ id, name, status, shortDescription, origin }: ProductEditFormProps) {
  const [state, action, isPending] = useActionState<UpdateProductState, FormData>(
    updateProduct,
    null,
  );

  return (
    <form action={action} className="max-w-xl space-y-4">
      <input type="hidden" name="id" value={id} />

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Tên sản phẩm</span>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="status">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="status"
          name="status"
          defaultValue={status === "archived" ? "draft" : status}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <label className="block text-sm" htmlFor="shortDescription">
        <span className="font-medium text-slate-700">Mô tả ngắn</span>
        <textarea
          id="shortDescription"
          name="shortDescription"
          defaultValue={shortDescription}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="block text-sm" htmlFor="origin">
        <span className="font-medium text-slate-700">Xuất xứ</span>
        <input
          id="origin"
          name="origin"
          defaultValue={origin}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : "Lưu"}
        </button>
        <a
          href="/admin/products"
          className="min-h-10 flex items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hủy
        </a>
      </div>
    </form>
  );
}
