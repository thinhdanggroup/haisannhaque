import { CheckoutPanel } from "@/components/storefront/checkout-panel";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { MobileStorefrontDock } from "@/components/storefront/mobile-storefront-dock";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { calculateCartTotals } from "@/src/features/cart/pricing";
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

function formatCurrency(value: number): string {
  return `${value.toLocaleString("vi-VN")}d`;
}

export default async function CheckoutPage() {
  const chrome = await loadStorefrontChrome();
  const totals = calculateCartTotals({
    items: [],
    shippingTotal: 0,
    loyaltyDiscount: 0,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StorefrontHeader navItems={chrome.headerNav} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-sm font-semibold text-teal-700">Secure checkout</p>
        <h1 className="mt-1 text-3xl font-semibold">Checkout</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter delivery and payment details to place your seafood order.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <CheckoutForm />
          <CheckoutPanel title="Order summary">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Discount</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(totals.discountTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Shipping</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(totals.shippingTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-base font-semibold">
                <span>Total</span>
                <span className="text-red-600">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>
            <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
              Cold-chain delivery windows are confirmed after order placement.
            </p>
          </CheckoutPanel>
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
