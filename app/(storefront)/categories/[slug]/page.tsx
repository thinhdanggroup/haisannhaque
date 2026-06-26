import type { Metadata } from "next";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
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

type CategoryMeta = {
  name: string;
  description: string | null;
};

type CategoryPageData = {
  chrome: StorefrontChrome;
  products: ProductCard[];
  category: CategoryMeta;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await loadCategoryPageData(slug);

  return {
    title: category.name,
    description:
      category.description ??
      `Mua ${category.name} tươi ngon tại Hải Sản Nhà Quê. Giao lạnh tận nhà.`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

async function loadCategoryPageData(slug: string): Promise<CategoryPageData> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return {
      chrome: playwrightChromeFixture,
      products: [],
      category: { name: slug.replaceAll("-", " "), description: null },
    };
  }

  const client = await createServerClient();
  const [chrome, products, categoryResult] = await Promise.all([
    getStorefrontChrome(client),
    getProductsByCategory(client, slug),
    client
      .from("categories")
      .select("name, description")
      .eq("slug", slug)
      .eq("is_active", true)
      .single(),
  ]);

  const category: CategoryMeta = categoryResult.data
    ? { name: categoryResult.data.name, description: categoryResult.data.description ?? null }
    : { name: slug.replaceAll("-", " "), description: null };

  return { chrome, products, category };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const { chrome, products, category } = await loadCategoryPageData(slug);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StorefrontHeader navItems={chrome.headerNav} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: category.name, href: `/categories/${slug}` },
          ]}
        />
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">Danh mục</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              {category.name}
            </h1>
            {category.description ? (
              <p className="mt-2 text-sm text-slate-600">{category.description}</p>
            ) : null}
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
