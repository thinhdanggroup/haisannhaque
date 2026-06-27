import { cookies } from "next/headers";
import { CheckoutPanel } from "@/components/storefront/checkout-panel";
import { CheckoutForm } from "@/components/storefront/checkout-form";
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
import { createAdminClient } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

async function loadStorefrontChrome(): Promise<StorefrontChrome> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return playwrightChromeFixture;
  }
  const client = await createServerClient();
  return getStorefrontChrome(client);
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default async function CheckoutPage() {
  const chrome = await loadStorefrontChrome();

  const cookieStore = await cookies();
  const cartId = cookieStore.get("cart_id")?.value;

  let items: CartLineItemData[] = [];

  if (cartId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("cart_items")
      .select(`
        id,
        quantity,
        unit_price,
        product_variants (
          id,
          sku,
          unit,
          option_summary,
          products ( name )
        )
      `)
      .eq("cart_id", cartId)
      .order("created_at", { ascending: true });

    items = (data ?? []).map((row) => {
      const variant = Array.isArray(row.product_variants)
        ? row.product_variants[0]
        : row.product_variants;
      const product = variant
        ? Array.isArray(variant.products)
          ? variant.products[0]
          : variant.products
        : null;

      return {
        id: row.id,
        productName: product?.name ?? "Sản phẩm",
        variantLabel: variant?.option_summary ?? variant?.unit ?? "",
        sku: variant?.sku ?? "",
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        discountTotal: 0,
        imageUrl: null,
      };
    });
  }

  const totals = calculateCartTotals({
    items,
    shippingTotal: 0,
    loyaltyDiscount: 0,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StorefrontHeader navItems={chrome.headerNav} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-sm font-semibold text-teal-700">Thanh toán bảo mật</p>
        <h1 className="mt-1 text-3xl font-semibold">Thanh toán</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nhập thông tin giao hàng và thanh toán để đặt hải sản.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <CheckoutForm cartId={cartId} />
          <CheckoutPanel title="Tóm tắt đơn hàng">
            <div className="space-y-3 text-sm">
              {items.length > 0 && (
                <ul className="mb-4 divide-y divide-slate-100">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                      <span className="truncate text-slate-700">
                        {item.productName}
                        {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                        {" "}×{item.quantity}
                      </span>
                      <span className="shrink-0 font-medium text-slate-900">
                        {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}đ
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Tạm tính</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Giảm giá</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(totals.discountTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Phí giao hàng</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(totals.shippingTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-base font-semibold">
                <span>Tổng cộng</span>
                <span className="text-red-600">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>
            <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
              Khung giờ giao hàng giữ lạnh sẽ được xác nhận sau khi đặt hàng.
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
