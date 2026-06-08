import { notFound } from "next/navigation";
import { MobileStorefrontDock } from "@/components/storefront/mobile-storefront-dock";
import { ProductDetailView } from "@/components/storefront/product-detail-view";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { getProductBySlug } from "@/src/features/catalog/queries";
import type { ProductDetail } from "@/src/features/catalog/types";
import { getStorefrontChrome } from "@/src/features/cms/queries";
import {
  playwrightChromeFixture,
  shouldUseStorefrontPlaywrightFixture,
} from "@/src/features/cms/playwright-fixtures";
import type { StorefrontChrome } from "@/src/features/cms/types";
import { createServerClient } from "@/src/lib/supabase/server";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ProductPageData = {
  chrome: StorefrontChrome;
  product: ProductDetail | null;
};

export const dynamic = "force-dynamic";

function formatFixtureProductName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createPlaywrightProductFixture(slug: string): ProductDetail {
  const name = formatFixtureProductName(slug) || "Fresh seafood";

  return {
    id: `e2e-product-${slug}`,
    slug,
    name,
    shortDescription: "Fresh seafood prepared for local cold-chain delivery.",
    description:
      "This placeholder product detail is used only for Playwright smoke tests with the exact fake Supabase environment.",
    origin: "Vietnam",
    temperatureClass: "fresh",
    images: [
      {
        url: `https://placehold.co/1000x1000/e0f2fe/0f172a?text=${encodeURIComponent(
          name,
        )}`,
        altText: name,
      },
      {
        url: "https://placehold.co/800x800/dcfce7/0f172a?text=Packed+Fresh",
        altText: "Packed fresh seafood",
      },
      {
        url: "https://placehold.co/800x800/ffedd5/0f172a?text=Cold+Chain",
        altText: "Cold chain delivery",
      },
    ],
    variants: [
      {
        id: `e2e-variant-${slug}-small`,
        sku: `${slug.toUpperCase()}-SMALL`,
        unit: "tray 200g",
        optionSummary: "Tray 200g",
        listPrice: 299000,
        salePrice: 249000,
        isActive: true,
      },
      {
        id: `e2e-variant-${slug}-family`,
        sku: `${slug.toUpperCase()}-FAMILY`,
        unit: "combo 500g",
        optionSummary: "Family combo 500g",
        listPrice: 549000,
        salePrice: null,
        isActive: true,
      },
    ],
  };
}

async function loadProductPageData(slug: string): Promise<ProductPageData> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return {
      chrome: playwrightChromeFixture,
      product: createPlaywrightProductFixture(slug),
    };
  }

  const client = await createServerClient();
  const [chrome, product] = await Promise.all([
    getStorefrontChrome(client),
    getProductBySlug(client, slug),
  ]);

  return { chrome, product };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const { chrome, product } = await loadProductPageData(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StorefrontHeader navItems={chrome.headerNav} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <ProductDetailView product={product} />
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
