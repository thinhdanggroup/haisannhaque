"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const addWishlistItemSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
});

const removeWishlistItemSchema = z.object({
  wishlistItemId: z.string().uuid(),
});

export async function addWishlistItem(input: z.infer<typeof addWishlistItemSchema>) {
  const payload = addWishlistItemSchema.parse(input);
  const client = await createServerClient();

  const { data: wishlist, error: wishlistError } = await client
    .from("wishlists")
    .upsert({ customer_id: payload.customerId }, { onConflict: "customer_id" })
    .select("id")
    .single();

  if (wishlistError) {
    throw wishlistError;
  }

  const { error } = await client.from("wishlist_items").upsert(
    {
      wishlist_id: wishlist.id,
      product_id: payload.productId,
    },
    { onConflict: "wishlist_id,product_id" },
  );

  if (error) {
    throw error;
  }

  revalidatePath("/account/wishlist");
}

export async function removeWishlistItem(input: z.infer<typeof removeWishlistItemSchema>) {
  const payload = removeWishlistItemSchema.parse(input);
  const client = await createServerClient();

  const { error } = await client.from("wishlist_items").delete().eq("id", payload.wishlistItemId);

  if (error) {
    throw error;
  }

  revalidatePath("/account/wishlist");
}
