"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  addCartItemSchema,
  removeCartItemSchema,
  updateCartItemSchema,
  type AddCartItemInput,
  type RemoveCartItemInput,
  type UpdateCartItemInput,
} from "./schema";
import { createServerClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

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

export async function addToCart(
  variantId: string,
  unitPrice: number,
  quantity: number,
): Promise<void> {
  const cookieStore = await cookies();
  let cartId = cookieStore.get("cart_id")?.value;

  const admin = createAdminClient();

  if (!cartId) {
    const { data: cart, error: cartError } = await admin
      .from("carts")
      .insert({ session_id: crypto.randomUUID() })
      .select("id")
      .single();

    if (cartError || !cart) throw cartError ?? new Error("Failed to create cart");

    const newCartId = cart.id as string;
    cartId = newCartId;
    cookieStore.set("cart_id", newCartId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const { error } = await admin.from("cart_items").upsert(
    { cart_id: cartId, variant_id: variantId, quantity, unit_price: unitPrice },
    { onConflict: "cart_id,variant_id" },
  );

  if (error) throw error;

  revalidatePath("/cart");
}
