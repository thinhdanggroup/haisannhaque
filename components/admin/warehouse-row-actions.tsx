"use client";

import Link from "next/link";
import { deleteWarehouse } from "@/src/features/inventory/warehouse-actions";

export function WarehouseRowActions({ id, code }: { id: string; code: string }) {
  async function handleDelete() {
    if (!confirm(`Delete warehouse "${code}"? This cannot be undone.`)) return;
    await deleteWarehouse(id);
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/warehouses/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Edit
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
