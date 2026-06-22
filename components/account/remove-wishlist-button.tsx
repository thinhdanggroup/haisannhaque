"use client";

import { useTransition } from "react";
import { removeWishlistItem } from "@/src/features/wishlist/actions";

export function RemoveWishlistButton({ wishlistItemId }: { wishlistItemId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => removeWishlistItem({ wishlistItemId }))}
      disabled={pending}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? "Đang xóa…" : "Xóa"}
    </button>
  );
}
