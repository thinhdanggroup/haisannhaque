import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { MobileStorefrontDock } from "@/components/storefront/mobile-storefront-dock";
import { ProductGrid } from "@/components/storefront/product-grid";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { searchProducts } from "@/src/features/catalog/queries";
import type { ProductCard } from "@/src/features/catalog/types";
import { getStorefrontChrome } from "@/src/features/cms/queries";
import {
  playwrightChromeFixture,
  shouldUseStorefrontPlaywrightFixture,
} from "@/src/features/cms/playwright-fixtures";
import type { StorefrontChrome } from "@/src/features/cms/types";
import { createServerClient } from "@/src/lib/supabase/server";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

type SearchPageData = {
  chrome: StorefrontChrome;
  products: ProductCard[];
};

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

async function loadSearchPageData(query: string): Promise<SearchPageData> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return {
      chrome: playwrightChromeFixture,
      products: [],
    };
  }

  const client = await createServerClient();
  const [chrome, products] = await Promise.all([
    getStorefrontChrome(client),
    searchProducts(client, query),
  ]);

  return { chrome, products };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() ?? "";
  const { chrome, products } = await loadSearchPageData(query);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StorefrontHeader navItems={chrome.headerNav} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">Tim kiem</p>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                Search results
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {query
                  ? `Results for "${query}"`
                  : "Enter a seafood keyword to browse matching products."}
              </p>
            </div>
            <form action="/search" className="flex min-h-11 gap-2 lg:w-[420px]">
              <input
                name="q"
                defaultValue={query}
                placeholder="Tim san pham"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600"
              />
              <button
                type="submit"
                className="rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"
              >
                Tim
              </button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
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
            emptyMessage={
              query
                ? "Khong tim thay san pham phu hop."
                : "Nhap tu khoa de tim san pham."
            }
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
