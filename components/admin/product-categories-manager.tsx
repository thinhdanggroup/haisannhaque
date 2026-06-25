"use client";

import { useActionState, useTransition } from "react";
import {
  addProductCategory,
  removeProductCategory,
  type CategoryAssignmentState,
} from "@/src/features/catalog/admin-actions";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductCategoriesManagerProps = {
  productId: string;
  assigned: Category[];
  allCategories: Category[];
};

export function ProductCategoriesManager({
  productId,
  assigned,
  allCategories,
}: ProductCategoriesManagerProps) {
  const [state, action, isPending] = useActionState<CategoryAssignmentState, FormData>(
    addProductCategory,
    null,
  );

  const [isRemoving, startRemove] = useTransition();

  const assignedIds = new Set(assigned.map((c) => c.id));
  const available = allCategories.filter((c) => !assignedIds.has(c.id));

  function handleRemove(categoryId: string) {
    startRemove(async () => {
      await removeProductCategory(productId, categoryId);
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">Danh mục</h2>

      {assigned.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {assigned.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-slate-800">{c.name}</span>
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => handleRemove(c.id)}
                className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Chưa thuộc danh mục nào.</p>
      )}

      {available.length > 0 && (
        <form
          action={action}
          className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <input type="hidden" name="productId" value={productId} />

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Thêm vào danh mục
          </p>

          {state?.error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <label className="block text-sm" htmlFor="cat-select">
            <span className="font-medium text-slate-700">Chọn danh mục</span>
            <select
              id="cat-select"
              name="categoryId"
              required
              defaultValue=""
              className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              <option value="" disabled>
                Chọn danh mục…
              </option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {isPending ? "Đang thêm…" : "Thêm"}
          </button>
        </form>
      )}

      {available.length === 0 && assigned.length > 0 && (
        <p className="text-sm text-slate-500">Sản phẩm đã thuộc tất cả danh mục.</p>
      )}
    </div>
  );
}
