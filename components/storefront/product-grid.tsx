import type { ProductCard as ProductCardData } from "@/src/features/catalog/types";
import type { CmsProductCard } from "@/src/features/cms/types";
import { ProductCard } from "./product-card";

type StorefrontProductCard = ProductCardData | CmsProductCard;

type ProductGridProps = {
  products: StorefrontProductCard[];
  emptyMessage?: string;
  density?: "default" | "dense";
};

export function ProductGrid({
  products,
  emptyMessage = "Chưa có sản phẩm phù hợp.",
  density = "default",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-teal-200 bg-[#f7fbfa] px-4 py-10 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  const gridClassName =
    density === "dense"
      ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : "grid grid-cols-2 gap-2.5 md:grid-cols-4";

  return (
    <div className={gridClassName}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
