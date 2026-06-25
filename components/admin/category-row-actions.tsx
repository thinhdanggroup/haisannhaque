"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteCategory } from "@/src/features/catalog/category-actions";

export function CategoryRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Xóa danh mục "${name}"? Danh mục con sẽ trở thành cấp cao nhất.`)) return;
    try {
      await deleteCategory(id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/categories/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Sửa
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Xóa
      </button>
    </div>
  );
}
