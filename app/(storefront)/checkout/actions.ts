"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createOrderFromCheckout } from "@/src/features/checkout/create-order";
import { createServerClient } from "@/src/lib/supabase/server";

export async function submitCheckout(formData: FormData) {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cart_id")?.value;

  if (!cartId) {
    redirect("/cart");
  }

  const client = await createServerClient();

  const result = await createOrderFromCheckout(client, {
    cartId,
    receiverName: formData.get("receiverName") as string,
    phone: formData.get("phone") as string,
    province: formData.get("province") as string,
    district: formData.get("district") as string,
    ward: formData.get("ward") as string,
    addressLine: formData.get("addressLine") as string,
    paymentMethod: formData.get("paymentMethod") as "cod" | "bank_transfer" | "momo" | "vnpay",
    deliveryMethod: formData.get("deliveryMethod") as "local_delivery" | "branch_pickup" | "nationwide_shipping",
    orderNote: (formData.get("orderNote") as string) || undefined,
    idempotencyKey: crypto.randomUUID(),
  });

  cookieStore.delete("cart_id");

  redirect(`/checkout/confirmation?orderNo=${result.orderNo}`);
}
