import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/src/features/catalog/types";
import type { CmsProductCard } from "@/src/features/cms/types";
import { calculateDiscountPercent, formatVnd } from "@/src/lib/format";
import { applyFlashSalePrice } from "@/src/features/flash-sales/price-utils";
import { FlashSaleCountdown } from "./flash-sale-countdown";
import {
  isTextPlaceholderImage,
  StorefrontPlaceholderImage,
} from "./storefront-placeholder-image";
import { AddToCartButton } from "./add-to-cart-button";

type StorefrontProductCard = ProductCardData | CmsProductCard;

type FlashSaleInfo = {
  discountPct: number;
  endAt: string;
};

type ProductCardProps = {
  product: StorefrontProductCard;
  index?: number;
  flashSale?: FlashSaleInfo | null;
};

function getBadgeText(product: StorefrontProductCard): string | null {
  return "badgeText" in product ? product.badgeText ?? null : null;
}

function getSoldLabel(product: StorefrontProductCard): string | null {
  if (!("soldLabel" in product)) {
    return null;
  }
  return product.soldLabel || null;
}

export function ProductCard({ product, index = 0, flashSale }: ProductCardProps) {
  // list_price is compareAtPrice (if already on sale) or price
  const listPrice = product.compareAtPrice ?? product.price;
  const flashSalePrice =
    flashSale != null ? applyFlashSalePrice(listPrice, flashSale.discountPct) : null;
  // Only apply flash sale discount if it's actually cheaper than the current price
  const effectiveFlashSale =
    flashSalePrice != null && flashSalePrice < product.price ? flashSale : null;

  const displayPrice = effectiveFlashSale ? flashSalePrice! : product.price;
  const displayCompareAt = effectiveFlashSale ? listPrice : product.compareAtPrice;
  const regularDiscountPercent = effectiveFlashSale
    ? null
    : calculateDiscountPercent(product.price, product.compareAtPrice);

  const badgeText = getBadgeText(product);
  const soldLabel = getSoldLabel(product);
  const cardDelay = Math.min(index, 15) * 45;

  return (
    <article
      data-testid="homepage-product-card"
      className="sf-card-enter group relative h-full overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 pb-10 shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition hover:border-teal-300 hover:shadow-[0_12px_28px_rgba(15,74,76,0.12)]"
      style={{ "--sf-card-delay": `${cardDelay}ms` } as React.CSSProperties}
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-md bg-[#eff8f6]">
          {isTextPlaceholderImage(product.imageUrl) ? (
            <StorefrontPlaceholderImage label={product.name} />
          ) : product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1280px) 220px, (min-width: 768px) 25vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-[1.04]"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              No image
            </div>
          )}
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-4rem)] flex-wrap gap-1">
            {effectiveFlashSale ? (
              <span className="rounded bg-red-600 px-1.5 py-1 text-[11px] font-bold leading-none text-white">
                🔥 -{effectiveFlashSale.discountPct}%
              </span>
            ) : regularDiscountPercent ? (
              <span className="rounded bg-red-600 px-1.5 py-1 text-[11px] font-bold leading-none text-white">
                -{regularDiscountPercent}%
              </span>
            ) : null}
            {badgeText ? (
              <span className="rounded bg-[#0f766e] px-1.5 py-1 text-[11px] font-bold leading-none text-white">
                {badgeText}
              </span>
            ) : null}
          </div>
          {effectiveFlashSale && (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-red-600/80 py-0.5">
              <FlashSaleCountdown endAt={effectiveFlashSale.endAt} className="text-white" />
            </div>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 min-h-9 text-xs font-semibold leading-[18px] text-slate-950">
          {product.name}
        </h3>
        {"unitLabel" in product && product.unitLabel ? (
          <div className="mt-1 text-[11px] font-semibold text-teal-700">
            {product.unitLabel}
          </div>
        ) : null}
        <div className="mt-1.5 flex min-h-10 flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
          <div className="min-w-0 max-w-full">
            <div className="break-words text-sm font-extrabold text-red-600">
              {formatVnd(displayPrice)}
            </div>
            {displayCompareAt ? (
              <div className="break-words text-xs text-slate-500 line-through">
                {formatVnd(displayCompareAt)}
              </div>
            ) : null}
          </div>
          {soldLabel ? (
            <div className="max-w-full break-words text-left text-[11px] font-semibold text-slate-500 sm:text-right">
              {soldLabel}
            </div>
          ) : null}
        </div>
        {!product.isAvailable ? (
          <div className="mt-2 text-xs font-medium text-slate-500">Hết hàng</div>
        ) : null}
      </Link>
      <AddToCartButton
        variantId={product.defaultVariantId ?? ""}
        unitPrice={displayPrice}
        isAvailable={product.isAvailable && product.defaultVariantId != null}
        productName={product.name}
      />
    </article>
  );
}
