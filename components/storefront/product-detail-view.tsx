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
import { ProductCard } from "./product-card";
import { ProductImageGallery } from "./product-image-gallery";

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
  const variants = getDisplayVariants(product.variants);

  return (
    <div className="sf-detail-enter space-y-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <ProductImageGallery images={images} productName={product.name} />

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
        <h2 className="text-xl font-bold text-slate-950">Mô tả sản phẩm</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
          {product.description ??
            product.shortDescription ??
            "Mô tả sản phẩm đang được cập nhật."}
        </p>
      </section>

      {product.relatedProducts.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">Sản phẩm liên quan</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {product.relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
