import Link from "next/link";
import type { CmsSection, StorefrontNavLink } from "@/src/features/cms/types";
import { NavigationItemIcon } from "./category-nav";
import { storefrontTheme } from "./storefront-theme";

type CategoryShortcutStripProps = {
  /** Supplies the heading only; the shortcuts themselves come from `items`. */
  section: CmsSection;
  items: StorefrontNavLink[];
};

export function CategoryShortcutStrip({
  section,
  items,
}: CategoryShortcutStripProps) {
  const headingId = `home-section-${section.id}`;

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby={headingId}
      className={`${storefrontTheme.section} ${storefrontTheme.sectionPadding}`}
    >
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          {section.title ? (
            <h2 id={headingId} className="text-sm font-extrabold uppercase text-slate-950">
              {section.title}
            </h2>
          ) : (
            <h2 id={headingId} className="sr-only">
              Danh mục hải sản phổ biến
            </h2>
          )}
          {section.subtitle ? (
            <p className="mt-1 text-xs text-slate-600">{section.subtitle}</p>
          ) : null}
        </div>
      </div>
      <nav
        aria-label="Danh mục hải sản phổ biến"
        className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 xl:grid-cols-6"
      >
        {items.map((shortcut) => (
          <Link
            key={shortcut.id}
            href={shortcut.href}
            className="flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-md border border-teal-100 bg-[#f5fbf9] px-2 text-center text-xs font-bold text-slate-700 transition hover:border-teal-300 hover:bg-white hover:text-teal-700"
          >
            <NavigationItemIcon
              iconKey={shortcut.iconKey}
              className="h-5 w-5 text-teal-600"
            />
            <span className="line-clamp-2">{shortcut.label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
