import Image from "next/image";
import type { CmsBrandAsset } from "@/src/features/cms/types";
import { isTextPlaceholderImage } from "./storefront-placeholder-image";

type OrderAppLinksProps = {
  assets: CmsBrandAsset[];
};

/** Logos of the delivery apps the shop sells on, each opening the shop's page. */
export function OrderAppLinks({ assets }: OrderAppLinksProps) {
  if (assets.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {assets.map((asset) => {
        const content = (
          <span className="flex h-12 min-w-24 items-center justify-center rounded-md border border-teal-100 bg-white px-3 shadow-sm transition hover:border-teal-300">
            {!isTextPlaceholderImage(asset.imageUrl) ? (
              <Image
                src={asset.imageUrl}
                alt={asset.altText}
                width={120}
                height={48}
                className="max-h-8 w-auto object-contain"
                unoptimized
              />
            ) : (
              <span className="text-xs font-bold text-slate-600">{asset.altText}</span>
            )}
          </span>
        );

        return asset.href ? (
          <a
            key={asset.id}
            href={asset.href}
            target="_blank"
            rel="noopener noreferrer"
            title={asset.altText}
          >
            {content}
          </a>
        ) : (
          <span key={asset.id}>{content}</span>
        );
      })}
    </div>
  );
}
