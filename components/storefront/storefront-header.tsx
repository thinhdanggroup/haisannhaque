import Link from "next/link";
import {
  Gift,
  MapPin,
  Phone,
  Search,
  ShoppingCart,
  Truck,
  UserRound,
} from "lucide-react";
import type { CmsNavigationItem } from "@/src/features/cms/types";
import { CategoryNav } from "./category-nav";

type StorefrontHeaderProps = {
  navItems: CmsNavigationItem[];
};

export function StorefrontHeader({ navItems }: StorefrontHeaderProps) {
  return (
    <header
      data-visual-treatment="market-template"
      className="sticky top-0 z-40 border-b border-teal-100 bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,74,76,0.08)]"
    >
      <div className="bg-[#0f3f46] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 text-xs font-bold md:px-4 md:text-sm">
          <span className="inline-flex min-w-0 items-center gap-2">
            <Gift className="h-4 w-4 shrink-0 text-orange-200" aria-hidden="true" />
            <span className="truncate">Mua gói sao biển - nhận ưu đãi riêng</span>
          </span>
          <span className="hidden items-center gap-2 whitespace-nowrap sm:flex">
            <Truck className="h-4 w-4 text-orange-200" aria-hidden="true" />
            <span>Giao hàng 2H</span>
          </span>
        </div>
      </div>
      <div className="bg-white text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:px-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="shrink-0 text-xl font-extrabold tracking-normal text-[#0f766e] md:text-2xl"
            >
              Hải Sản Nhà Quê
            </Link>
            <div className="flex items-center gap-2 md:hidden">
              <Link
                href="/account/orders"
                aria-label="Tài khoản"
                className="grid h-10 w-10 place-items-center rounded-full border border-teal-100 bg-teal-50 text-teal-700"
              >
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/cart"
                aria-label="Giỏ hàng"
                className="grid h-10 w-10 place-items-center rounded-full bg-orange-700 text-white shadow-sm"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <form
            action="/search"
            className="flex min-h-11 flex-1 items-center overflow-hidden rounded-lg border border-teal-200 bg-white shadow-sm focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100"
          >
            <Search className="ml-3 h-5 w-5 text-slate-500" aria-hidden="true" />
            <input
              name="q"
              type="search"
              placeholder="Tìm hải sản"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="min-h-11 bg-orange-700 px-4 text-sm font-bold text-white transition hover:bg-orange-800"
            >
              Tìm
            </button>
          </form>

          <div className="hidden items-center gap-2 md:flex">
            <a
              href="tel:19000098"
              className="flex min-h-10 items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 text-sm font-bold text-orange-700"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span>1900 0098</span>
            </a>
            <a
              href="#stores"
              className="flex min-h-10 items-center gap-2 rounded-md border border-teal-100 bg-teal-50 px-3 text-sm font-semibold text-teal-700"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>Hệ thống cửa hàng</span>
            </a>
            <Link
              href="/account/orders"
              className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <span>Tài khoản</span>
            </Link>
            <Link
              href="/cart"
              className="flex min-h-10 items-center gap-2 rounded-md bg-[#0f766e] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f665f]"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span>Giỏ hàng</span>
            </Link>
          </div>
        </div>
      </div>
      <CategoryNav items={navItems} />
    </header>
  );
}
