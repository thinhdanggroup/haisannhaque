"use client";

import { useActionState } from "react";
import {
  updateVariantPricing,
  type UpdateVariantPricingState,
} from "@/src/features/catalog/admin-actions";

type Variant = {
  id: string;
  sku: string;
  unit: string;
  optionSummary: string | null;
  listPrice: number;
  salePrice: number | null;
  isActive: boolean;
};

type ProductVariantsPricingProps = {
  productId: string;
  variants: Variant[];
};

export function ProductVariantsPricing({ productId, variants }: ProductVariantsPricingProps) {
  const [state, action, isPending] = useActionState<UpdateVariantPricingState, FormData>(
    updateVariantPricing,
    null,
  );

  if (variants.length === 0) {
    return (
      <div className="max-w-xl">
        <h2 className="text-sm font-semibold text-slate-700">Giá sản phẩm</h2>
        <p className="mt-2 text-sm text-slate-500">Chưa có biến thể nào.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">Giá sản phẩm</h2>

      <form action={action} className="space-y-3">
        <input type="hidden" name="productId" value={productId} />

        {state && "error" in state && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {state && "success" in state && (
          <p className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
            Đã lưu giá thành công.
          </p>
        )}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Biến thể</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Giá niêm yết (₫)</th>
                <th className="px-4 py-3 text-left">Giá khuyến mãi (₫)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v) => (
                <tr key={v.id} className={v.isActive ? "" : "opacity-50"}>
                  <input type="hidden" name="variantId" value={v.id} />
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {v.optionSummary ?? v.unit}
                    {!v.isActive && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                        Tắt
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{v.sku}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      name={`listPrice_${v.id}`}
                      defaultValue={v.listPrice}
                      min={0}
                      step={1000}
                      required
                      className="min-h-9 w-36 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      name={`salePrice_${v.id}`}
                      defaultValue={v.salePrice ?? ""}
                      min={0}
                      step={1000}
                      placeholder="—"
                      className="min-h-9 w-36 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : "Lưu giá"}
        </button>
      </form>
    </div>
  );
}
