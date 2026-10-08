"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import {
  saveRecommendationTabs,
  searchProductsForRecommendations,
  type RecommendationTabsState,
} from "@/src/features/cms/admin-actions";

type ProductOption = { id: string; name: string; slug: string };

type EditableTab = {
  key: string;
  label: string;
  href: string;
  productIds: string[];
};

type RecommendationTabsEditorProps = {
  sectionId: string;
  initialTabs: EditableTab[];
  initialProducts: ProductOption[];
};

const INPUT_CLASS =
  "mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

function nextTabKey(tabs: EditableTab[]): string {
  const keys = new Set(tabs.map((tab) => tab.key));
  let index = tabs.length + 1;
  while (keys.has(`tab-${index}`)) index += 1;
  return `tab-${index}`;
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function TabProductPicker({
  tab,
  productsById,
  onAdd,
  onRemove,
  onMove,
}: {
  tab: EditableTab;
  productsById: Map<string, ProductOption>;
  onAdd: (product: ProductOption) => void;
  onRemove: (productId: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [isSearching, startSearch] = useTransition();

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      setResults(await searchProductsForRecommendations(value));
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Sản phẩm ({tab.productIds.length})
      </p>
      {tab.productIds.length > 0 ? (
        <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {tab.productIds.map((productId, index) => (
            <li key={productId} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-5 text-xs text-slate-400">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-slate-800">
                {productsById.get(productId)?.name ?? productId}
              </span>
              <button
                type="button"
                aria-label="Lên"
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Xuống"
                disabled={index === tab.productIds.length - 1}
                onClick={() => onMove(index, index + 1)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Bỏ sản phẩm"
                onClick={() => onRemove(productId)}
                className="rounded p-1 text-red-500 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-slate-500">Chưa chọn sản phẩm cho tab này.</p>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Tìm sản phẩm để thêm…"
          autoComplete="off"
          aria-label={`Tìm sản phẩm cho tab ${tab.label}`}
          className={INPUT_CLASS}
        />
        {isSearching && (
          <span className="absolute right-3 top-3.5 text-xs text-slate-400">Đang tìm…</span>
        )}
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {results.map((product) => {
              const alreadyAdded = tab.productIds.includes(product.id);
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => {
                      onAdd(product);
                      setQuery("");
                      setResults([]);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-white"
                  >
                    <span className="truncate">{product.name}</span>
                    {alreadyAdded && <span className="text-xs">Đã thêm</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function RecommendationTabsEditor({
  sectionId,
  initialTabs,
  initialProducts,
}: RecommendationTabsEditorProps) {
  const [state, formAction, isPending] = useActionState<RecommendationTabsState, FormData>(
    saveRecommendationTabs,
    null,
  );
  const [tabs, setTabs] = useState<EditableTab[]>(initialTabs);
  const [productsById, setProductsById] = useState(
    () => new Map(initialProducts.map((product) => [product.id, product])),
  );
  const [isDirty, setIsDirty] = useState(false);

  function updateTabs(updater: (tabs: EditableTab[]) => EditableTab[]) {
    setTabs(updater);
    setIsDirty(true);
  }

  function updateTab(index: number, patch: Partial<EditableTab>) {
    updateTabs((current) =>
      current.map((tab, tabIndex) => (tabIndex === index ? { ...tab, ...patch } : tab)),
    );
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
      <input type="hidden" name="tabs" value={JSON.stringify(tabs)} />

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

      {tabs.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Chưa có tab nào. Bấm “Thêm tab” để bắt đầu.
        </p>
      )}

      {tabs.map((tab, index) => (
        <fieldset
          key={index}
          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <legend className="text-sm font-bold text-slate-800">
              Tab {index + 1}
              {index === 0 && (
                <span className="ml-2 text-xs font-normal text-slate-500">(mặc định khi mở trang)</span>
              )}
            </legend>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Chuyển tab lên"
                disabled={index === 0}
                onClick={() => updateTabs((current) => move(current, index, index - 1))}
                className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Chuyển tab xuống"
                disabled={index === tabs.length - 1}
                onClick={() => updateTabs((current) => move(current, index, index + 1))}
                className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Xóa tab"
                onClick={() => {
                  if (confirm(`Xóa tab "${tab.label || index + 1}"?`)) {
                    updateTabs((current) => current.filter((_, tabIndex) => tabIndex !== index));
                  }
                }}
                className="rounded border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Tên tab</span>
              <input
                value={tab.label}
                required
                maxLength={60}
                onChange={(event) => updateTab(index, { label: event.target.value })}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Khóa</span>
              <input
                value={tab.key}
                required
                pattern="[a-z0-9-]+"
                onChange={(event) => updateTab(index, { key: event.target.value })}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Liên kết (tuỳ chọn)</span>
            <span className="ml-1 text-xs text-slate-400">
              — nếu có, bấm tab sẽ mở trang này thay vì đổi danh sách sản phẩm
            </span>
            <input
              value={tab.href}
              placeholder="/categories/…"
              onChange={(event) => updateTab(index, { href: event.target.value })}
              className={INPUT_CLASS}
            />
          </label>

          <TabProductPicker
            tab={tab}
            productsById={productsById}
            onAdd={(product) => {
              setProductsById((current) => new Map(current).set(product.id, product));
              updateTab(index, { productIds: [...tab.productIds, product.id] });
            }}
            onRemove={(productId) =>
              updateTab(index, { productIds: tab.productIds.filter((id) => id !== productId) })
            }
            onMove={(from, to) => updateTab(index, { productIds: move(tab.productIds, from, to) })}
          />
        </fieldset>
      ))}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() =>
            updateTabs((current) => [
              ...current,
              { key: nextTabKey(current), label: "", href: "", productIds: [] },
            ])
          }
          className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50"
        >
          <Plus className="h-4 w-4" /> Thêm tab
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : "Lưu tab"}
        </button>
        {isDirty && <span className="self-center text-xs text-amber-600">Có thay đổi chưa lưu</span>}
      </div>
    </form>
  );
}
