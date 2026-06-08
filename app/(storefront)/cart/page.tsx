import Link from "next/link";
import { CartLineItem } from "@/components/storefront/cart-line-item";
import { CartSummary } from "@/components/storefront/cart-summary";
import { MobileStorefrontDock } from "@/components/storefront/mobile-storefront-dock";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { calculateCartTotals } from "@/src/features/cart/pricing";
import type { CartLineItem as CartLineItemData } from "@/src/features/cart/types";
import { getStorefrontChrome } from "@/src/features/cms/queries";
import {
  playwrightChromeFixture,
  shouldUseStorefrontPlaywrightFixture,
} from "@/src/features/cms/playwright-fixtures";
import type { StorefrontChrome } from "@/src/features/cms/types";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadStorefrontChrome(): Promise<StorefrontChrome> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return playwrightChromeFixture;
  }

  const client = await createServerClient();
  return getStorefrontChrome(client);
}

export default async function CartPage() {
  const chrome = await loadStorefrontChrome();
  const items: CartLineItemData[] = [];
  const totals = calculateCartTotals({
    items,
    shippingTotal: 0,
    loyaltyDiscount: 0,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StorefrontHeader navItems={chrome.headerNav} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <p className="text-sm font-semibold text-teal-700">Cart</p>
          <h1 className="mt-1 text-3xl font-semibold">Shopping cart</h1>
          <p className="mt-2 text-sm text-slate-600">
            Review your seafood selections before checkout.
          </p>
          <div className="mt-6 space-y-3">
            {items.length > 0 ? (
              items.map((item) => <CartLineItem key={item.id} item={item} />)
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Your cart is empty.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Add fresh seafood to start an order.
                </p>
                <Link
                  href="/search"
                  className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  Continue shopping
                </Link>
              </div>
            )}
          </div>
        </section>
        <CartSummary totals={totals} />
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
