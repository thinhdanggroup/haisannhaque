"use client";

import Link from "next/link";
import { ProductPreviewLink } from "@/components/admin/product-preview-link";
import { archiveProduct } from "@/src/features/catalog/admin-actions";

type ProductRowActionsProps = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export function ProductRowActions({ id, name, slug, status }: ProductRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <ProductPreviewLink
        slug={slug}
        status={status}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      />
      <Link
        href={`/admin/products/${id}/edit`}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Sửa
      </Link>
      <form
        action={archiveProduct.bind(null, id)}
        onSubmit={(e) => {
          if (!confirm(`Lưu trữ "${name}"?`)) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Lưu trữ
        </button>
      </form>
    </div>
  );
}
