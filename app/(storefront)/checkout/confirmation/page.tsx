import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { MobileStorefrontDock } from "@/components/storefront/mobile-storefront-dock";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { getStorefrontChrome } from "@/src/features/cms/queries";
import {
  playwrightChromeFixture,
  shouldUseStorefrontPlaywrightFixture,
} from "@/src/features/cms/playwright-fixtures";
import { createServerClient } from "@/src/lib/supabase/server";

export const preferredRegion = "sin1";

export default async function CheckoutConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNo?: string }>;
}) {
  const { orderNo } = await searchParams;

  const chrome = shouldUseStorefrontPlaywrightFixture()
    ? playwrightChromeFixture
    : await getStorefrontChrome(await createServerClient());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StorefrontHeader navItems={chrome.headerNav} />
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-50">
          <CheckCircle className="h-10 w-10 text-teal-600" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold">Đặt hàng thành công!</h1>
        {orderNo && (
          <p className="mt-3 text-slate-600">
            Mã đơn hàng:{" "}
            <span className="font-semibold text-slate-900">{orderNo}</span>
          </p>
        )}
        <p className="mt-2 text-sm text-slate-500">
          Chúng tôi sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất.
          Cảm ơn bạn đã tin tưởng Hải Sản Nhà Quê!
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account/orders"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-6 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Xem đơn hàng
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
          >
            Tiếp tục mua sắm
          </Link>
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
