"use client";

import { useState, useTransition } from "react";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { addToCart } from "@/src/features/cart/actions";

type AddToCartButtonProps = {
  variantId: string;
  unitPrice: number;
  isAvailable: boolean;
  productName: string;
};

export function AddToCartButton({
  variantId,
  unitPrice,
  isAvailable,
  productName,
}: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  if (!isAvailable) {
    return (
      <span
        aria-label={`${productName} hết hàng`}
        className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-400"
      >
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await addToCart(variantId, unitPrice, 1);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      } catch {
        // silently fail — user can add from product page
      }
    });
  }

  return (
    <button
      type="button"
      aria-label={`Thêm ${productName} vào giỏ hàng`}
      onClick={handleClick}
      disabled={isPending}
      className={`absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full text-white shadow-sm transition disabled:opacity-60 ${
        added ? "bg-teal-600" : "bg-orange-500 hover:bg-orange-600"
      }`}
    >
      {added ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Plus className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
