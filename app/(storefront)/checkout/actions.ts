"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createOrderFromCheckout } from "@/src/features/checkout/create-order";
import { ensureCustomerForUser } from "@/src/features/account/customer-link";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createServerClient } from "@/src/lib/supabase/server";

function parseOrderError(msg: string): string {
  if (msg.includes("Insufficient stock")) return "Sản phẩm không đủ hàng trong kho. Vui lòng liên hệ shop.";
  if (msg.includes("cart") || msg.includes("Cart")) return "Không tìm thấy giỏ hàng. Vui lòng thêm sản phẩm lại.";
  return "Đã có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.";
}

export async function submitCheckout(formData: FormData) {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cart_id")?.value;

  if (!cartId) {
    redirect("/cart");
  }

  const client = await createServerClient();

  // Attach the order to a signed-in customer so it shows in /account/orders
  // and earns loyalty points once completed (the order copies
  // carts.customer_id). Guests check out exactly as before.
  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    try {
      const admin = createAdminClient();
      const customerId = await ensureCustomerForUser(admin, user);
      const { error } = await admin.from("carts").update({ customer_id: customerId }).eq("id", cartId);
      if (error) throw error;
    } catch (err) {
      // Never block a sale on the loyalty link.
      console.error("submitCheckout: could not link cart to customer", err);
    }
  }

  let result;
  try {
    result = await createOrderFromCheckout(client, {
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = parseOrderError(msg);
    redirect(`/checkout?error=${encodeURIComponent(friendly)}`);
  }

  cookieStore.delete("cart_id");

  const paymentMethod = formData.get("paymentMethod") === "bank_transfer" ? "&method=bank_transfer" : "";
  redirect(`/checkout/confirmation?orderNo=${result.orderNo}${paymentMethod}`);
}
