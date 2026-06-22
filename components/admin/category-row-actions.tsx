"use client";

import Link from "next/link";
import { deleteCategory } from "@/src/features/catalog/category-actions";

export function CategoryRowActions({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Delete category "${name}"? Child categories will become top-level.`)) return;
    try {
      await deleteCategory(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/categories/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Edit
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
