"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addRelatedProduct,
  removeRelatedProduct,
  searchProductsForRelated,
  type RelatedProductState,
} from "@/src/features/catalog/admin-actions";

type RelatedProduct = {
  id: string;
  name: string;
  slug: string;
};

type ProductRelatedManagerProps = {
  productId: string;
  related: RelatedProduct[];
};

export function ProductRelatedManager({ productId, related }: ProductRelatedManagerProps) {
  const [state, action, isPending] = useActionState<RelatedProductState, FormData>(
    addRelatedProduct,
    null,
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RelatedProduct[]>([]);
  const [selected, setSelected] = useState<RelatedProduct | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const found = await searchProductsForRelated(productId, value);
      setResults(found);
    });
  }

  function handleSelect(product: RelatedProduct) {
    setSelected(product);
    setQuery(product.name);
    setResults([]);
  }

  function handleRemove(relatedProductId: string) {
    startRemove(async () => {
      await removeRelatedProduct(productId, relatedProductId);
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">Sản phẩm liên quan</h2>

      {related.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {related.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-slate-800">{p.name}</span>
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => handleRemove(p.id)}
                className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Chưa có sản phẩm liên quan.</p>
      )}

      <form
        action={(fd) => {
          setQuery("");
          setSelected(null);
          setResults([]);
          action(fd);
        }}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="relatedProductId" value={selected?.id ?? ""} />

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Thêm sản phẩm liên quan
        </p>

        {state?.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700" htmlFor="related-search">
            Tìm sản phẩm
          </label>
          <input
            id="related-search"
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Nhập tên sản phẩm…"
            autoComplete="off"
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          {isSearching && (
            <span className="absolute right-3 top-9 text-xs text-slate-400">Đang tìm…</span>
          )}
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-md">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || !selected}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang thêm…" : "Thêm"}
        </button>
      </form>
    </div>
  );
}
