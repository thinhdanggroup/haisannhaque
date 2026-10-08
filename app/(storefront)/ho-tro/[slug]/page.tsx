import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileStorefrontDock } from "@/components/storefront/mobile-storefront-dock";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { SupportPageBody } from "@/components/storefront/support-page-body";
import { getStorefrontChrome } from "@/src/features/cms/queries";
import {
  playwrightChromeFixture,
  shouldUseStorefrontPlaywrightFixture,
} from "@/src/features/cms/playwright-fixtures";
import { getSupportPageBySlug, SUPPORT_FOOTER_GROUP } from "@/src/features/cms/support-pages";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getSupportPageBySlug(await createServerClient(), slug);
  return { title: page ? `${page.title} – Hải Sản Nhà Quê` : "Hỗ trợ khách hàng – Hải Sản Nhà Quê" };
}

export default async function SupportPage({ params }: Props) {
  const { slug } = await params;
  const client = await createServerClient();

  const [page, chrome] = await Promise.all([
    getSupportPageBySlug(client, slug),
    shouldUseStorefrontPlaywrightFixture()
      ? Promise.resolve(playwrightChromeFixture)
      : getStorefrontChrome(client),
  ]);

  if (!page) notFound();

  const siblings = chrome.footerLinks.filter((link) => link.groupLabel === SUPPORT_FOOTER_GROUP);

  return (
    <div className="min-h-screen bg-[#f2f7f5] text-slate-950">
      <StorefrontHeader navItems={chrome.categoryNav} />
      <main className="mx-auto grid max-w-5xl gap-4 px-3 py-6 md:grid-cols-[220px_minmax(0,1fr)] md:px-4">
        <aside className="h-fit rounded-lg border border-teal-100/80 bg-white p-3">
          <p className="px-2 pb-2 text-sm font-bold text-slate-950">{SUPPORT_FOOTER_GROUP}</p>
          <nav className="space-y-1">
            {siblings.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                aria-current={link.href.endsWith(`/${page.slug}`) ? "page" : undefined}
                className="block rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-teal-50 aria-[current=page]:bg-teal-50 aria-[current=page]:font-semibold aria-[current=page]:text-teal-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <article className="rounded-lg border border-teal-100/80 bg-white p-5 shadow-[0_10px_28px_rgba(15,74,76,0.07)] md:p-8">
          <h1 className="mb-5 text-2xl font-extrabold text-slate-950">{page.title}</h1>
          <SupportPageBody body={page.body} />
        </article>
      </main>
      <MobileStorefrontDock items={chrome.mobileDock} />
      <StorefrontFooter
        footerLinks={chrome.footerLinks}
        paymentAssets={chrome.paymentAssets}
        partnerAssets={chrome.partnerAssets}
        trustAssets={chrome.trustAssets}
        bankAccounts={chrome.bankAccounts}
        orderAppAssets={chrome.orderAppAssets}
      />
    </div>
  );
}
