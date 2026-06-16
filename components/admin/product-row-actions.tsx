"use client";

import Link from "next/link";
import { archiveProduct } from "@/src/features/catalog/admin-actions";

type ProductRowActionsProps = {
  id: string;
  name: string;
};

export function ProductRowActions({ id, name }: ProductRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/products/${id}/edit`}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit
      </Link>
      <form
        action={archiveProduct.bind(null, id)}
        onSubmit={(e) => {
          if (!confirm(`Archive "${name}"?`)) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Archive
        </button>
      </form>
    </div>
  );
}
