import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { MobileStorefrontDock } from "@/components/storefront/mobile-storefront-dock";
import { ProductGrid } from "@/components/storefront/product-grid";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { getProductsByCategory } from "@/src/features/catalog/queries";
import type { ProductCard } from "@/src/features/catalog/types";
import { getStorefrontChrome } from "@/src/features/cms/queries";
import {
  playwrightChromeFixture,
  shouldUseStorefrontPlaywrightFixture,
} from "@/src/features/cms/playwright-fixtures";
import type { StorefrontChrome } from "@/src/features/cms/types";
import { createServerClient } from "@/src/lib/supabase/server";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type CategoryPageData = {
  chrome: StorefrontChrome;
  products: ProductCard[];
};

export const dynamic = "force-dynamic";

function formatCategoryTitle(slug: string): string {
  return slug.replaceAll("-", " ");
}

async function loadCategoryPageData(slug: string): Promise<CategoryPageData> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return {
      chrome: playwrightChromeFixture,
      products: [],
    };
  }

  const client = await createServerClient();
  const [chrome, products] = await Promise.all([
    getStorefrontChrome(client),
    getProductsByCategory(client, slug),
  ]);

  return { chrome, products };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const { chrome, products } = await loadCategoryPageData(slug);
  const categoryTitle = formatCategoryTitle(slug);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StorefrontHeader navItems={chrome.headerNav} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">Danh muc</p>
            <h1 className="mt-1 text-2xl font-bold capitalize md:text-3xl">
              {categoryTitle}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Fresh seafood selections prepared for quick browsing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filter
            </button>
            <button
              type="button"
              disabled
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed"
            >
              <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
              Sort
            </button>
          </div>
        </div>

        <div className="mt-5">
          <ProductGrid
            products={products}
            density="dense"
            emptyMessage="Chua co san pham trong danh muc nay."
          />
        </div>
      </main>
      <MobileStorefrontDock items={chrome.mobileDock} />
      <StorefrontFooter
        footerLinks={chrome.footerLinks}
        paymentAssets={chrome.paymentAssets}
        partnerAssets={chrome.partnerAssets}
        trustAssets={chrome.trustAssets}
      />
    </div>
  );
}
