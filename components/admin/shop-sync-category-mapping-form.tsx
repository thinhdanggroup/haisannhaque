"use client";

import { useActionState } from "react";
import type { ShopSyncCategoryMappingState } from "@/src/features/shop-sync/admin-actions";

type MappableCategoryOption = { id: string; name: string };

type ShopSyncCategoryMappingFormProps = {
  action: (prev: ShopSyncCategoryMappingState, formData: FormData) => Promise<ShopSyncCategoryMappingState>;
  placeholderCategoryId: string;
  options: MappableCategoryOption[];
};

export function ShopSyncCategoryMappingForm({
  action,
  placeholderCategoryId,
  options,
}: ShopSyncCategoryMappingFormProps) {
  const [state, formAction, isPending] = useActionState<ShopSyncCategoryMappingState, FormData>(action, null);

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="placeholderCategoryId" value={placeholderCategoryId} />
      <select
        name="targetCategoryId"
        required
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-600"
      >
        <option value="">Chọn danh mục…</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Đang lưu…" : "Gán"}
      </button>
      {state?.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
