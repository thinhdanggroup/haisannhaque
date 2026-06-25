"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteSupplier } from "@/src/features/procurement/supplier-actions";

export function SupplierRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Xóa nhà cung cấp "${name}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await deleteSupplier(id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/suppliers/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Sửa
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Xóa
      </button>
    </div>
  );
}
