"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteWarehouse } from "@/src/features/inventory/warehouse-actions";

export function WarehouseRowActions({ id, code }: { id: string; code: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Xóa kho "${code}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await deleteWarehouse(id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/warehouses/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Sửa
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Xóa
      </button>
    </div>
  );
}
