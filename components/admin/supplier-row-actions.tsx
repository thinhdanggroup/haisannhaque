"use client";

import Link from "next/link";
import { deleteSupplier } from "@/src/features/procurement/supplier-actions";

export function SupplierRowActions({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
    await deleteSupplier(id);
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/suppliers/${id}/edit`} className="text-sm text-teal-700 hover:underline">
        Edit
      </Link>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
