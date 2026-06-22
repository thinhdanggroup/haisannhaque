"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteSupplier } from "@/src/features/procurement/supplier-actions";

export function SupplierRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSupplier(id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
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
