import Link from "next/link";
import type { CmsBrandAsset } from "@/src/features/cms/types";
import { CheckoutPanel } from "./checkout-panel";
import { OrderAppLinks } from "./order-app-links";
import { PaymentMethodField } from "./payment-method-field";
import { submitCheckout } from "@/app/(storefront)/checkout/actions";

type CheckoutFormProps = {
  cartId?: string;
  bankAccounts?: CmsBrandAsset[];
  orderAppAssets?: CmsBrandAsset[];
  /** Signed-in customer: prefills the form and the order earns points. */
  customer?: { fullName: string | null; phone: string | null } | null;
};

export function CheckoutForm({
  cartId,
  bankAccounts = [],
  orderAppAssets = [],
  customer = null,
}: CheckoutFormProps) {
  return (
    <form action={submitCheckout} className="space-y-5">
      <input type="hidden" name="cartId" value={cartId ?? ""} />
      {customer ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          Đơn hàng này sẽ được tích điểm vào tài khoản của bạn khi hoàn tất.
        </p>
      ) : (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <Link href="/login?next=/checkout" className="font-semibold underline">
            Đăng nhập
          </Link>{" "}
          hoặc{" "}
          <Link href="/register?next=/checkout" className="font-semibold underline">
            đăng ký tài khoản
          </Link>{" "}
          để tích điểm cho đơn hàng này.
        </p>
      )}
      <CheckoutPanel title="Thông tin giao hàng">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" htmlFor="receiverName">
            <span className="font-medium text-slate-700">Họ và tên người nhận</span>
            <input
              id="receiverName"
              name="receiverName"
              autoComplete="name"
              defaultValue={customer?.fullName ?? undefined}
              required
              minLength={2}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            />
          </label>
          <label className="block text-sm" htmlFor="phone">
            <span className="font-medium text-slate-700">Số điện thoại</span>
            <input
              id="phone"
              name="phone"
              autoComplete="tel"
              defaultValue={customer?.phone ?? undefined}
              required
              minLength={8}
              pattern="[0-9+\s\-]{8,15}"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block text-sm" htmlFor="province">
            <span className="font-medium text-slate-700">Tỉnh / Thành phố</span>
            <input
              id="province"
              name="province"
              autoComplete="address-level1"
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            />
          </label>
          <label className="block text-sm" htmlFor="district">
            <span className="font-medium text-slate-700">Quận / Huyện</span>
            <input
              id="district"
              name="district"
              autoComplete="address-level2"
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            />
          </label>
          <label className="block text-sm" htmlFor="ward">
            <span className="font-medium text-slate-700">Phường / Xã</span>
            <input
              id="ward"
              name="ward"
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm" htmlFor="addressLine">
          <span className="font-medium text-slate-700">Địa chỉ cụ thể</span>
          <input
            id="addressLine"
            name="addressLine"
            autoComplete="street-address"
            required
            minLength={3}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
          />
        </label>
        <label className="mt-4 block text-sm" htmlFor="orderNote">
          <span className="font-medium text-slate-700">Ghi chú đơn hàng</span>
          <textarea
            id="orderNote"
            name="orderNote"
            rows={2}
            placeholder="Yêu cầu đặc biệt, giờ giao hàng..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
          />
        </label>
      </CheckoutPanel>
      <CheckoutPanel title="Thông tin thanh toán">
        <div className="mb-4 flex flex-wrap gap-2">
          {["COD", "Chuyển khoản", "MoMo", "VNPAY"].map((method) => (
            <span
              key={method}
              className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm"
            >
              {method}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" htmlFor="deliveryMethod">
            <span className="font-medium text-slate-700">Phương thức giao hàng</span>
            <select
              id="deliveryMethod"
              name="deliveryMethod"
              defaultValue="local_delivery"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            >
              <option value="local_delivery">Giao nhanh nội thành</option>
              <option value="branch_pickup">Nhận tại cửa hàng</option>
              <option value="nationwide_shipping">Giao toàn quốc</option>
            </select>
          </label>
          <PaymentMethodField bankAccounts={bankAccounts} />
        </div>
        {orderAppAssets.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-sm text-slate-600">Hoặc đặt hàng qua app:</p>
            <OrderAppLinks assets={orderAppAssets} />
          </div>
        )}
      </CheckoutPanel>
      <button
        type="submit"
        className="min-h-11 w-full rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Đặt hàng
      </button>
    </form>
  );
}
