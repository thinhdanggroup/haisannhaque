"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  addProductImage,
  removeProductImage,
  type AddImageState,
} from "@/src/features/catalog/image-actions";
import { ProductUploadForm } from "@/components/admin/product-upload-form";

type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
};

type ProductImagesManagerProps = {
  productId: string;
  images: ProductImage[];
};

export function ProductImagesManager({ productId, images }: ProductImagesManagerProps) {
  const [state, action, isPending] = useActionState<AddImageState, FormData>(
    addProductImage,
    null,
  );

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">Hình ảnh sản phẩm</h2>

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden aspect-square">
              <Image
                src={img.url}
                alt={img.altText ?? ""}
                fill
                className="object-cover"
                unoptimized
              />
              <form
                action={removeProductImage.bind(null, img.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  type="submit"
                  className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-700"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Chưa có hình ảnh.</p>
      )}

      <form action={action} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <input type="hidden" name="productId" value={productId} />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thêm hình ảnh</p>

        {state?.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <label className="block text-sm" htmlFor="img-url">
          <span className="font-medium text-slate-700">URL hình ảnh</span>
          <input
            id="img-url"
            name="url"
            type="url"
            placeholder="https://..."
            required
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <label className="block text-sm" htmlFor="img-alt">
          <span className="font-medium text-slate-700">Alt text (tuỳ chọn)</span>
          <input
            id="img-alt"
            name="altText"
            type="text"
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang thêm…" : "Thêm hình ảnh"}
        </button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">hoặc</span></div>
      </div>

      <ProductUploadForm productId={productId} />
    </div>
  );
}
