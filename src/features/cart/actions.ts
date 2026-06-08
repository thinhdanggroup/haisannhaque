"use server";

import { revalidatePath } from "next/cache";
import {
  addCartItemSchema,
  removeCartItemSchema,
  updateCartItemSchema,
  type AddCartItemInput,
  type RemoveCartItemInput,
  type UpdateCartItemInput,
} from "./schema";
import { createServerClient } from "@/src/lib/supabase/server";

export async function addCartItem(input: AddCartItemInput) {
  const payload = addCartItemSchema.parse(input);
  const client = await createServerClient();

  const { error } = await client.from("cart_items").upsert(
    {
      cart_id: payload.cartId,
      variant_id: payload.variantId,
      quantity: payload.quantity,
      unit_price: payload.unitPrice,
    },
    {
      onConflict: "cart_id,variant_id",
    },
  );

  if (error) {
    throw error;
  }

  revalidatePath("/cart");
}

export async function updateCartItem(input: UpdateCartItemInput) {
  const payload = updateCartItemSchema.parse(input);
  const client = await createServerClient();

  const { error } = await client
    .from("cart_items")
    .update({ quantity: payload.quantity })
    .eq("id", payload.cartItemId);

  if (error) {
    throw error;
  }

  revalidatePath("/cart");
}

export async function removeCartItem(input: RemoveCartItemInput) {
  const payload = removeCartItemSchema.parse(input);
  const client = await createServerClient();

  const { error } = await client.from("cart_items").delete().eq("id", payload.cartItemId);

  if (error) {
    throw error;
  }

  revalidatePath("/cart");
}
