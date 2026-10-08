"use client";

import { useActionState, useState } from "react";
import { saveSectionProducts, type SectionProductsState } from "@/src/features/cms/admin-actions";
import { TabProductPicker } from "./recommendation-tabs-editor";

type ProductOption = { id: string; name: string; slug: string };

type SectionProductsEditorProps = {
  sectionId: string;
  sectionTitle: string;
  initialProducts: ProductOption[];
};

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function SectionProductsEditor({
  sectionId,
  sectionTitle,
  initialProducts,
}: SectionProductsEditorProps) {
  const [state, formAction, isPending] = useActionState<SectionProductsState, FormData>(
    saveSectionProducts,
    null,
  );
  const [productIds, setProductIds] = useState(() => initialProducts.map((product) => product.id));
  const [productsById, setProductsById] = useState(
    () => new Map(initialProducts.map((product) => [product.id, product])),
  );
  const [isDirty, setIsDirty] = useState(false);

  function update(next: string[]) {
    setProductIds(next);
    setIsDirty(true);
  }

  return (
    <form
      action={(formData) => {
        setIsDirty(false);
        formAction(formData);
      }}
      className="max-w-3xl space-y-4"
    >
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="productIds" value={JSON.stringify(productIds)} />

      {state && "error" in state && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state && "success" in state && !isDirty && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Đã lưu. Trang chủ đã được cập nhật.
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <TabProductPicker
          tab={{ key: "section", label: sectionTitle, href: "", productIds }}
          productsById={productsById}
          onAdd={(product) => {
            setProductsById((current) => new Map(current).set(product.id, product));
            update([...productIds, product.id]);
          }}
          onRemove={(productId) => update(productIds.filter((id) => id !== productId))}
          onMove={(from, to) => update(move(productIds, from, to))}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : "Lưu sản phẩm"}
        </button>
        {isDirty && <span className="self-center text-xs text-amber-600">Có thay đổi chưa lưu</span>}
      </div>
    </form>
  );
}
