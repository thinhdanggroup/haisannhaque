import Image from "next/image";
import type { CartLineItem as CartLineItemData } from "@/src/features/cart/types";

type CartLineItemProps = {
  item: CartLineItemData;
};

export function CartLineItem({ item }: CartLineItemProps) {
  const lineTotal = item.quantity * item.unitPrice - item.discountTotal;
  const unitPrice = item.unitPrice.toLocaleString("vi-VN");

  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[112px_minmax(0,1fr)] md:p-4">
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
        <div>
          <div className="text-base font-semibold text-slate-950">
            {item.productName}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {item.variantLabel} · SKU: {item.sku}
          </div>
        </div>
        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Unit price
            </span>
            <span className="font-medium text-slate-900">{unitPrice}d</span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Quantity
            </span>
            <span className="font-medium text-slate-900">{item.quantity}</span>
          </div>
          <div className="sm:text-right">
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Line total
            </span>
            <span className="font-semibold text-red-600">
              {lineTotal.toLocaleString("vi-VN")}d
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
