import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  isSafeHref,
  parseRecommendationTabs,
  selectTabProducts,
} from "@/src/features/cms/recommendation-tabs";
import type { CmsSection } from "@/src/features/cms/types";
import { ProductGrid } from "./product-grid";
import { RecommendationTabSwitcher } from "./recommendation-tab-switcher";
import { storefrontTheme } from "./storefront-theme";

type RecommendationTabsProps = {
  section: CmsSection;
};

type TabView = {
  key: string;
  label: string;
  href: string | null;
  products: CmsSection["products"];
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

function getTabs(section: CmsSection): TabView[] {
  const tabs = parseRecommendationTabs(section.metadata);

  if (tabs.length > 0) {
    return tabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      href: tab.href,
      products: selectTabProducts(tab, section.products),
    }));
  }

  return [
    {
      key: "default",
      label: section.title ?? "Gợi ý cho bạn",
      href: null,
      products: section.products,
    },
  ];
}

function getViewMoreHref(section: CmsSection): string {
  const href = getMetadataString(section.metadata, "viewMoreHref");

  if (href && isSafeHref(href)) {
    return href;
  }

  return "/search";
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

      <RecommendationTabSwitcher
        tabs={tabs.map(({ key, label, href }) => ({ key, label, href }))}
        panels={tabs.map((tab) => (
          <ProductGrid
            key={tab.key}
            products={tab.products}
            density="dense"
            emptyMessage="Chưa có gợi ý phù hợp."
          />
        ))}
      />
    </section>
  );
}
