import Link from "next/link";
import { Menu } from "lucide-react";
import type { CmsNavigationItem } from "@/src/features/cms/types";
import { getNavigationItems, NavigationItemIcon } from "./category-nav";

type CategorySidebarProps = {
  items: CmsNavigationItem[];
};

export function CategorySidebar({ items }: CategorySidebarProps) {
  const visibleItems = getNavigationItems(items);

  return (
    <aside
      aria-label="Danh mục hải sản"
      className="hidden w-60 shrink-0 overflow-hidden rounded-lg border border-teal-100 bg-white shadow-[0_10px_28px_rgba(15,74,76,0.06)] lg:block"
    >
      <div className="flex min-h-11 items-center gap-2 bg-[#0f3f46] px-3 text-sm font-bold uppercase text-white">
        <Menu className="h-4 w-4" aria-hidden="true" />
        <span>Danh mục</span>
      </div>
      <nav className="p-2">
        {visibleItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex min-h-9 items-center gap-3 rounded-md px-2 text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-700"
          >
            <NavigationItemIcon
              iconKey={item.iconKey}
              className="h-4 w-4 text-teal-600"
            />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
