"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import type { CmsNavigationItem } from "@/src/features/cms/types";
import { getNavigationItems, NavigationItemIcon } from "./category-nav";

type CategoryNavProps = {
  items: CmsNavigationItem[];
};

export function CategoryNav({ items }: CategoryNavProps) {
  const visibleItems = getNavigationItems(items);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, []);

  function scroll(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  }

  return (
    <nav
      aria-label="Danh mục sản phẩm"
      className="relative hidden border-t border-teal-100 bg-[#0f766e] md:block"
    >
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          aria-label="Cuộn trái"
          className="absolute left-0 top-0 z-10 flex h-full items-center bg-gradient-to-r from-[#0f766e] to-transparent px-2 text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <NavigationItemIcon iconKey={item.iconKey} className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          aria-label="Cuộn phải"
          className="absolute right-0 top-0 z-10 flex h-full items-center bg-gradient-to-l from-[#0f766e] to-transparent px-2 text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </nav>
  );
}
