import { createServerClient } from "@/src/lib/supabase/server";
import { getAccountSessionState } from "@/src/features/account/actions";
import { getAccountProfile, getAccountOrders } from "@/src/features/account/queries";
import { redirect } from "next/navigation";

const statusLabels: Record<string, string> = {
  draft_checkout: "Nháp",
  awaiting_payment: "Chờ thanh toán",
  payment_failed: "Thanh toán thất bại",
  pending_confirmation: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  picking: "Đang lấy hàng",
  packed: "Đã đóng gói",
  dispatched: "Đang giao",
  delivery_attempted: "Giao không thành công",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Đã trả hàng",
  partially_returned: "Trả một phần",
  refunded: "Đã hoàn tiền",
};

export default async function AccountOrdersPage() {
  const session = await getAccountSessionState();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "unconfigured") {
    return <p className="text-sm text-slate-500">Chưa cấu hình Supabase.</p>;
  }

  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  const profile = user ? await getAccountProfile(client, user.id) : null;

  const orders = profile
    ? await getAccountOrders(client, profile.customerId)
    : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-4">Đơn hàng của tôi</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {orders.map((order) => (
            <div key={order.id} className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{order.orderNo}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {order.itemCount} sản phẩm · {order.placedAt}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{order.grandTotal}</p>
                <span className="inline-block mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
