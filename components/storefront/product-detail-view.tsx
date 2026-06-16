import Image from "next/image";
import {
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Snowflake,
  Truck,
} from "lucide-react";
import type {
  ProductDetail,
  ProductVariantSummary,
} from "@/src/features/catalog/types";
import { AddToCartControls } from "./add-to-cart-controls";

type ProductDetailViewProps = {
  product: ProductDetail;
};

function getDisplayVariants(
  variants: ProductVariantSummary[],
): ProductVariantSummary[] {
  return variants
    .filter((variant) => variant.isActive)
    .sort((left, right) => {
      const leftPrice = left.salePrice ?? left.listPrice;
      const rightPrice = right.salePrice ?? right.listPrice;

      if (leftPrice !== rightPrice) {
        return leftPrice - rightPrice;
      }

      const skuComparison = left.sku.localeCompare(right.sku);

      if (skuComparison !== 0) {
        return skuComparison;
      }

      return left.id.localeCompare(right.id);
    });
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const images = product.images;
  const primaryImage = images[0] ?? null;
  const variants = getDisplayVariants(product.variants);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.altText ?? product.name}
                fill
                sizes="(min-width: 1024px) 650px, 100vw"
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No image
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {(images.length > 0 ? images : [null]).slice(0, 4).map((image, index) => (
              <div
                key={image?.url ?? `empty-${index}`}
                className="relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-white"
              >
                {image ? (
                  <Image
                    src={image.url}
                    alt={image.altText ?? `${product.name} image ${index + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    No image
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-normal">
            <span className="inline-flex min-h-7 items-center gap-1 rounded bg-teal-50 px-2.5 text-teal-800">
              <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
              {product.temperatureClass}
            </span>
            {product.origin ? (
              <span className="inline-flex min-h-7 items-center rounded bg-slate-100 px-2.5 text-slate-700">
                {product.origin}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-2xl font-bold leading-tight text-slate-950 md:text-3xl">
            {product.name}
          </h1>

          {product.shortDescription ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {product.shortDescription}
            </p>
          ) : null}

          <div className="mt-5">
            <AddToCartControls variants={variants} />
          </div>

          <div className="mt-5 grid gap-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Cold-chain delivery from 8h - 21h.
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Quality checked before packing.
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Support for order changes before dispatch.
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Earn loyalty points on eligible orders.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-950">Mo ta san pham</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
          {product.description ??
            product.shortDescription ??
            "Mo ta san pham dang duoc cap nhat."}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-950">Related products</h2>
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
          Related product recommendations will appear here.
        </div>
      </section>
    </div>
  );
}
