"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FlashSaleEventState } from "@/src/features/flash-sales/admin-actions";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type Product = { id: string; name: string; slug: string };

type FlashSaleFormProps = {
  action: (prev: FlashSaleEventState, formData: FormData) => Promise<FlashSaleEventState>;
  products: Product[];
  initialValues?: {
    id: string;
    name: string;
    discountPct: number;
    startAt: string;
    endAt: string;
    isActive: boolean;
    selectedProductIds: string[];
  };
};

function toDatetimeLocal(iso: string): string {
  // Converts ISO 8601 to the value format expected by <input type="datetime-local">
  return iso.slice(0, 16);
}

export function FlashSaleForm({ action, products, initialValues }: FlashSaleFormProps) {
  const [state, formAction, isPending] = useActionState<FlashSaleEventState, FormData>(
    action,
    null,
  );
  const isEdit = Boolean(initialValues);
  const selectedSet = new Set(initialValues?.selectedProductIds ?? []);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {isEdit && <input type="hidden" name="id" value={initialValues!.id} />}

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Tên sự kiện</span>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialValues?.name}
          className={INPUT_CLASS}
          placeholder="Cuối tuần giảm 20%"
        />
      </label>

      <label className="block text-sm" htmlFor="discountPct">
        <span className="font-medium text-slate-700">Giảm giá (%)</span>
        <input
          id="discountPct"
          name="discountPct"
          type="number"
          min="1"
          max="99"
          required
          defaultValue={initialValues?.discountPct}
          className={INPUT_CLASS}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm" htmlFor="startAt">
          <span className="font-medium text-slate-700">Bắt đầu</span>
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            required
            defaultValue={initialValues ? toDatetimeLocal(initialValues.startAt) : undefined}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block text-sm" htmlFor="endAt">
          <span className="font-medium text-slate-700">Kết thúc</span>
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            required
            defaultValue={initialValues ? toDatetimeLocal(initialValues.endAt) : undefined}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <label className="block text-sm" htmlFor="isActive">
        <span className="font-medium text-slate-700">Trạng thái</span>
        <select
          id="isActive"
          name="isActive"
          defaultValue={initialValues?.isActive === false ? "false" : "true"}
          className={INPUT_CLASS}
        >
          <option value="true">Kích hoạt</option>
          <option value="false">Tạm dừng</option>
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Sản phẩm áp dụng</legend>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {products.length === 0 && (
            <p className="px-3 py-3 text-sm text-slate-500">Chưa có sản phẩm nào.</p>
          )}
          {products.map((product) => (
            <label key={product.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                name="productIds"
                value={product.id}
                defaultChecked={selectedSet.has(product.id)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              <span className="text-sm text-slate-700">{product.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo Flash Sale"}
        </button>
        <Link
          href="/admin/flash-sales"
          className="flex min-h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
