import { CategorySidebar } from "@/components/storefront/category-sidebar";
import { CategoryShortcutStrip } from "@/components/storefront/category-shortcut-strip";
import { ContentHighlights } from "@/components/storefront/content-highlights";
import { FloatingContactActions } from "@/components/storefront/floating-contact-actions";
import { HeroMerchandisingGrid } from "@/components/storefront/hero-merchandising-grid";
import { MobileStorefrontDock } from "@/components/storefront/mobile-storefront-dock";
import { PartnerStrip } from "@/components/storefront/partner-strip";
import { ProductRail } from "@/components/storefront/product-rail";
import { PromoBand } from "@/components/storefront/promo-band";
import { RecommendationTabs } from "@/components/storefront/recommendation-tabs";
import { ServiceStrip } from "@/components/storefront/service-strip";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { storefrontTheme } from "@/components/storefront/storefront-theme";
import {
  playwrightChromeFixture,
  playwrightHomeFixture,
  shouldUseStorefrontPlaywrightFixture,
} from "@/src/features/cms/playwright-fixtures";
import { getHomePageContent, getStorefrontChrome } from "@/src/features/cms/queries";
import type {
  CmsSection,
  HomePageContent,
  StorefrontChrome,
} from "@/src/features/cms/types";
import { getActiveFlashSale } from "@/src/features/flash-sales/queries";
import type { ActiveFlashSale } from "@/src/features/flash-sales/types";
import { createServerClient } from "@/src/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

async function loadStorefrontChrome(
  client: SupabaseClient,
): Promise<StorefrontChrome> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return playwrightChromeFixture;
  }

  return getStorefrontChrome(client);
}

async function loadHomePageContent(client: SupabaseClient): Promise<HomePageContent> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return playwrightHomeFixture;
  }

  return getHomePageContent(client);
}

function renderHomeSection(section: CmsSection, flashSale: ActiveFlashSale | null) {
  switch (section.type) {
    case "hero":
      return <HeroMerchandisingGrid key={section.id} section={section} />;
    case "service_strip":
      return <ServiceStrip key={section.id} section={section} />;
    case "category_shortcuts":
      return <CategoryShortcutStrip key={section.id} section={section} />;
    case "promo_band":
      return <PromoBand key={section.id} section={section} />;
    case "product_rail":
    case "flash_sale":
      return <ProductRail key={section.id} section={section} flashSale={flashSale} />;
    case "recommendation_tabs":
      return <RecommendationTabs key={section.id} section={section} />;
    case "content_highlights":
      return <ContentHighlights key={section.id} section={section} />;
    case "partner_strip":
      return <PartnerStrip key={section.id} section={section} />;
    default:
      return null;
  }
}

export default async function StorefrontHomePage() {
  const client = await createServerClient();
  const [chrome, home, flashSale] = await Promise.all([
    loadStorefrontChrome(client),
    loadHomePageContent(client),
    getActiveFlashSale(client),
  ]);

  return (
    <div
      data-testid="storefront-home-shell"
      data-theme="seafood-market-v2"
      className={storefrontTheme.shell}
    >
      <StorefrontHeader navItems={chrome.headerNav} />
      <main>
        <div className={storefrontTheme.mainWrap}>
          <CategorySidebar items={chrome.sidebarNav} />
          <div className={storefrontTheme.contentStack}>
            {home.sections.map((section) => renderHomeSection(section, flashSale))}
          </div>
        </div>
      </main>
      <FloatingContactActions />
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
