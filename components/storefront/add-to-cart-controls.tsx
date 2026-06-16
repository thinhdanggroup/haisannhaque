"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { addToCart } from "@/src/features/cart/actions";
import { formatVnd } from "@/src/lib/format";

type Variant = {
  id: string;
  sku: string;
  unit: string;
  optionSummary: string | null;
  listPrice: number;
  salePrice: number | null;
  isActive: boolean;
};

type AddToCartControlsProps = {
  variants: Variant[];
};

export function AddToCartControls({ variants }: AddToCartControlsProps) {
  const activeVariants = variants.filter((v) => v.isActive);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"added" | "error" | null>(null);

  const variant = activeVariants[selectedIndex] ?? activeVariants[0] ?? null;
  const price = variant ? (variant.salePrice ?? variant.listPrice) : 0;
  const comparePrice = variant?.salePrice != null ? variant.listPrice : null;

  function handleAddToCart() {
    if (!variant) return;
    startTransition(async () => {
      try {
        await addToCart(variant.id, price, quantity);
        setFeedback("added");
        setTimeout(() => setFeedback(null), 2500);
      } catch {
        setFeedback("error");
        setTimeout(() => setFeedback(null), 2500);
      }
    });
  }

  if (activeVariants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600">
        Sản phẩm đang cập nhật quy cách.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Price */}
      <div className="rounded-lg bg-red-50 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-normal text-red-700">Giá bán</div>
        <div className="mt-1 text-3xl font-bold text-red-600">{formatVnd(price)}</div>
        {comparePrice != null ? (
          <div className="mt-1 text-sm text-slate-500 line-through">{formatVnd(comparePrice)}</div>
        ) : null}
      </div>

      {/* Variant selector */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-950">Quy cách</legend>
        <div className="mt-2 grid gap-2">
          {activeVariants.map((v, index) => (
            <label
              key={v.id}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm transition ${
                selectedIndex === index
                  ? "border-teal-600 bg-teal-50"
                  : "border-slate-200 bg-slate-50 hover:border-teal-300"
              }`}
            >
              <input
                type="radio"
                name="variant"
                checked={selectedIndex === index}
                onChange={() => setSelectedIndex(index)}
                className="h-4 w-4 accent-teal-700"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-950">{v.optionSummary ?? v.unit}</span>
                <span className="block text-xs text-slate-500">SKU: {v.sku}</span>
              </span>
              <span className="text-sm font-bold text-red-600">{formatVnd(v.salePrice ?? v.listPrice)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Quantity */}
      <div>
        <div className="text-sm font-semibold text-slate-950">Số lượng</div>
        <div className="mt-2 inline-grid grid-cols-[40px_64px_40px] overflow-hidden rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="grid h-10 place-items-center text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            aria-label="Số lượng"
            value={quantity}
            readOnly
            className="h-10 border-x border-slate-200 text-center text-sm font-semibold outline-none"
          />
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => setQuantity((q) => q + 1)}
            className="grid h-10 place-items-center text-slate-600 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback === "added" && (
        <p className="text-sm font-medium text-teal-700">✓ Đã thêm vào giỏ hàng!</p>
      )}
      {feedback === "error" && (
        <p className="text-sm font-medium text-red-600">Có lỗi xảy ra. Vui lòng thử lại.</p>
      )}

      {/* Buttons */}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isPending}
          className="min-h-12 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {isPending ? "Đang thêm…" : "Thêm vào giỏ"}
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isPending}
          className="min-h-12 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          Mua ngay
        </button>
      </div>
    </div>
  );
}
