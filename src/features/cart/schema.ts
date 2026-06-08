import { z } from "zod";

export const addCartItemSchema = z.object({
  cartId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const updateCartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const removeCartItemSchema = z.object({
  cartItemId: z.string().uuid(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
