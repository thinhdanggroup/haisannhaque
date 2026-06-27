import { CheckoutPanel } from "./checkout-panel";
import { submitCheckout } from "@/app/(storefront)/checkout/actions";

type CheckoutFormProps = {
  cartId?: string;
};

export function CheckoutForm({ cartId }: CheckoutFormProps) {
  return (
    <form action={submitCheckout} className="space-y-5">
      <input type="hidden" name="cartId" value={cartId ?? ""} />
      <CheckoutPanel title="Thông tin giao hàng">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" htmlFor="receiverName">
            <span className="font-medium text-slate-700">Họ và tên người nhận</span>
            <input
              id="receiverName"
              name="receiverName"
              autoComplete="name"
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
          <label className="block text-sm" htmlFor="paymentMethod">
            <span className="font-medium text-slate-700">Phương thức thanh toán</span>
            <select
              id="paymentMethod"
              name="paymentMethod"
              defaultValue="cod"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            >
              <option value="cod">Tiền mặt khi nhận hàng</option>
              <option value="bank_transfer">Chuyển khoản ngân hàng</option>
              <option value="momo">MoMo</option>
              <option value="vnpay">VNPAY</option>
            </select>
          </label>
        </div>
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
