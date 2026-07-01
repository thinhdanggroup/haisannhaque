import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CmsSection } from "@/src/features/cms/types";
import type { ActiveFlashSale } from "@/src/features/flash-sales/types";
import { FlashSaleCountdown } from "./flash-sale-countdown";
import { ProductGrid } from "./product-grid";
import { storefrontTheme } from "./storefront-theme";

type ProductRailProps = {
  section: CmsSection;
  flashSale?: ActiveFlashSale | null;
};

type ViewMoreLinkProps = {
  href: string;
  label?: string;
};

type FlashCountdownItem = {
  value: string;
  label: string;
};

function getViewMoreHref(section: CmsSection): string {
  const metadataHref = section.metadata.viewMoreHref;

  if (typeof metadataHref === "string" && metadataHref.length > 0) {
    return metadataHref;
  }

  const bannerHref = section.banners[0]?.ctaHref;

  if (bannerHref) {
    return bannerHref;
  }

  return "/search";
}

function getMetadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getFlashCountdownItems(section: CmsSection): FlashCountdownItem[] {
  const items = section.metadata.countdownItems;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const value = typeof candidate.value === "string" ? candidate.value.trim() : "";
      const label = typeof candidate.label === "string" ? candidate.label.trim() : "";

      if (value.length === 0 || label.length === 0) {
        return null;
      }

      return { value, label };
    })
    .filter((item): item is FlashCountdownItem => item !== null)
    .slice(0, 3);
}

function FlashSaleMeta({ section, flashSale }: ProductRailProps) {
  if (section.type !== "flash_sale") {
    return null;
  }

  if (flashSale) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-md bg-red-600 px-2 py-1 text-white">Đang giảm</span>
        <span className="text-slate-600">Kết thúc sau</span>
        <FlashSaleCountdown endAt={flashSale.endAt} />
      </div>
    );
  }

  const saleBadge = getMetadataString(section.metadata, "saleBadge") ?? "Flash sale";
  const countdownLabel = getMetadataString(section.metadata, "countdownLabel");
  const countdownItems = getFlashCountdownItems(section);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="rounded-md bg-red-600 px-2 py-1 text-white">{saleBadge}</span>
      {countdownLabel ? (
        <span className="text-slate-600">{countdownLabel}</span>
      ) : null}
      {countdownItems.length > 0 ? (
        <span className="flex items-center gap-1">
          {countdownItems.map((item) => (
            <span
              key={`${item.value}-${item.label}`}
              className="inline-flex items-center gap-1 rounded-md bg-slate-950 px-2 py-1 text-white"
            >
              <span>{item.value}</span>
              <span className="text-[10px] font-medium text-slate-300">
                {item.label}
              </span>
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function ViewMoreLink({ href, label }: ViewMoreLinkProps) {
  const ariaLabel = label ? `Xem thêm ${label}` : undefined;

  const content = (
    <>
      <span>Xem thêm</span>
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </>
  );

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={storefrontTheme.viewMoreLink} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} className={storefrontTheme.viewMoreLink} aria-label={ariaLabel}>
      {content}
    </a>
  );
}

export function ProductRail({ section, flashSale }: ProductRailProps) {
  const headingId = `home-section-${section.id}`;
  const title = section.title ?? section.key;
  const isFlashSale = section.type === "flash_sale";
  const sectionClassName = isFlashSale
    ? "overflow-hidden rounded-lg border border-orange-200 bg-[#fff8f1] p-3 shadow-[0_10px_28px_rgba(154,52,18,0.08)] ring-1 ring-orange-100 md:p-4"
    : `${storefrontTheme.section} ${storefrontTheme.sectionPadding}`;
  const headerClassName = isFlashSale
    ? "mb-3 flex min-h-10 flex-col gap-2 border-b border-orange-200 pb-3 sm:flex-row sm:items-center sm:justify-between"
    : storefrontTheme.sectionHeader;
  const titleClassName = isFlashSale
    ? "text-base font-extrabold text-red-700 md:text-lg"
    : storefrontTheme.sectionTitle;

  return (
    <section
      aria-labelledby={headingId}
      className={sectionClassName}
    >
      <div className={headerClassName}>
        <div className="min-w-0">
          <h2
            id={headingId}
            className={titleClassName}
          >
            {title}
          </h2>
          {section.subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{section.subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <FlashSaleMeta section={section} flashSale={flashSale} />
          <ViewMoreLink href={getViewMoreHref(section)} label={title} />
        </div>
      </div>

      <ProductGrid
        products={section.products}
        density="dense"
        emptyMessage="Chưa có sản phẩm trong khu vực này."
        flashSale={flashSale}
      />
    </section>
  );
}
