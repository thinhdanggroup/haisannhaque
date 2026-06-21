"use client";

import Image from "next/image";
import { useTransition } from "react";
import { updateCartItem, removeCartItem } from "@/src/features/cart/actions";
import type { CartLineItem as CartLineItemData } from "@/src/features/cart/types";

type CartLineItemProps = {
  item: CartLineItemData;
};

export function CartLineItem({ item }: CartLineItemProps) {
  const [isPending, startTransition] = useTransition();
  const lineTotal = item.quantity * item.unitPrice - item.discountTotal;
  const unitPrice = item.unitPrice.toLocaleString("vi-VN");

  function handleQuantityChange(delta: number) {
    const next = item.quantity + delta;
    if (next < 1) return;
    startTransition(() => updateCartItem({ cartItemId: item.id, quantity: next }));
  }

  function handleRemove() {
    startTransition(() => removeCartItem({ cartItemId: item.id }));
  }

  return (
    <div className={`grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-opacity md:grid-cols-[112px_minmax(0,1fr)] md:p-4 ${isPending ? "opacity-50" : ""}`}>
      <div className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            fill
            sizes="(min-width: 768px) 112px, 88px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No image
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-semibold text-slate-950">
              {item.productName}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {item.variantLabel} · SKU: {item.sku}
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={isPending}
            aria-label="Remove item"
            className="shrink-0 rounded p-1 text-slate-400 transition hover:text-red-500 disabled:pointer-events-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Unit price
            </span>
            <span className="font-medium text-slate-900">{unitPrice}đ</span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Quantity
            </span>
            <div className="mt-1 flex items-center gap-1">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={isPending || item.quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              >
                −
              </button>
              <span className="w-8 text-center font-medium text-slate-900">
                {item.quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={isPending}
                aria-label="Increase quantity"
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Line total
            </span>
            <span className="font-semibold text-red-600">
              {lineTotal.toLocaleString("vi-VN")}đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
