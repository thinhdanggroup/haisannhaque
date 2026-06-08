import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CmsSection } from "@/src/features/cms/types";
import { ProductGrid } from "./product-grid";
import { storefrontTheme } from "./storefront-theme";

type RecommendationTabsProps = {
  section: CmsSection;
};

type RecommendationTab = {
  label: string;
  href: string | null;
};

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

function isSafeHref(href: string): boolean {
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#");
}

function normalizeTab(value: unknown): RecommendationTab | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
  const href = typeof candidate.href === "string" ? candidate.href.trim() : "";

  if (label.length === 0) {
    return null;
  }

  return {
    label,
    href: href.length > 0 && isSafeHref(href) ? href : null,
  };
}

function getTabs(section: CmsSection): RecommendationTab[] {
  const tabs = section.metadata.tabs;

  if (Array.isArray(tabs)) {
    const normalizedTabs = tabs
      .map(normalizeTab)
      .filter((tab): tab is RecommendationTab => tab !== null);

    if (normalizedTabs.length > 0) {
      return normalizedTabs;
    }
  }

  return [
    { label: section.title ?? "Gợi ý cho bạn", href: null },
    { label: "Hải sản thường mua", href: "/categories/best-sellers" },
    { label: "Combo tiết kiệm", href: "/categories/promotions" },
    { label: "Sẵn ăn", href: "/categories/ready-to-eat" },
  ];
}

function getViewMoreHref(section: CmsSection): string {
  const href = getMetadataString(section.metadata, "viewMoreHref");

  if (href && isSafeHref(href)) {
    return href;
  }

  return "/search";
}

function TabItem({
  tab,
  isActive,
}: {
  tab: RecommendationTab;
  isActive: boolean;
}) {
  const className = isActive
    ? "inline-flex min-h-8 shrink-0 items-center rounded-full bg-[#0f766e] px-3 text-xs font-bold text-white shadow-sm"
    : "inline-flex min-h-8 shrink-0 items-center rounded-full border border-teal-100 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700";

  if (tab.href?.startsWith("/")) {
    return (
      <Link href={tab.href} className={className}>
        {tab.label}
      </Link>
    );
  }

  if (tab.href?.startsWith("#")) {
    return (
      <a href={tab.href} className={className}>
        {tab.label}
      </a>
    );
  }

  return <span className={className}>{tab.label}</span>;
}

export function RecommendationTabs({ section }: RecommendationTabsProps) {
  const headingId = `home-section-${section.id}`;
  const title = section.title ?? "Gợi ý cho bạn";
  const tabs = getTabs(section);
  const viewMoreHref = getViewMoreHref(section);

  return (
    <section
      aria-labelledby={headingId}
      className={`${storefrontTheme.section} ${storefrontTheme.sectionPadding}`}
    >
      <div className="mb-3 flex flex-col gap-3 border-b border-teal-100 pb-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-extrabold text-orange-700 md:text-lg">
            {title}
          </h2>
          {section.subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{section.subtitle}</p>
          ) : null}
        </div>
        <Link
          href={viewMoreHref}
          className={`${storefrontTheme.viewMoreLink} w-fit`}
          aria-label={`Xem thêm ${title}`}
        >
          <span>Xem thêm</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div
        className="mb-3 flex gap-2 overflow-x-auto pb-1"
        role="list"
        aria-label="Nhóm gợi ý"
      >
        {tabs.map((tab, index) => (
          <span key={`${tab.label}-${index}`} role="listitem">
            <TabItem tab={tab} isActive={index === 0} />
          </span>
        ))}
      </div>

      <ProductGrid
        products={section.products}
        density="dense"
        emptyMessage="Chưa có gợi ý phù hợp."
      />
    </section>
  );
}
