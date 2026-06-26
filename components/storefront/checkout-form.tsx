import { CheckoutPanel } from "./checkout-panel";

type CheckoutFormProps = {
  cartId?: string;
};

export function CheckoutForm({ cartId }: CheckoutFormProps) {
  return (
    <form className="space-y-5">
      <input type="hidden" name="cartId" value={cartId ?? ""} />
      <CheckoutPanel title="Delivery information">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" htmlFor="receiverName">
            <span className="font-medium text-slate-700">Receiver name</span>
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
            <span className="font-medium text-slate-700">Phone number</span>
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
            <span className="font-medium text-slate-700">Province / City</span>
            <input
              id="province"
              name="province"
              autoComplete="address-level1"
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            />
          </label>
          <label className="block text-sm" htmlFor="district">
            <span className="font-medium text-slate-700">District</span>
            <input
              id="district"
              name="district"
              autoComplete="address-level2"
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            />
          </label>
          <label className="block text-sm" htmlFor="ward">
            <span className="font-medium text-slate-700">Ward</span>
            <input
              id="ward"
              name="ward"
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm" htmlFor="addressLine">
          <span className="font-medium text-slate-700">Street address</span>
          <input
            id="addressLine"
            name="addressLine"
            autoComplete="street-address"
            required
            minLength={3}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
          />
        </label>
      </CheckoutPanel>
      <CheckoutPanel title="Payment information">
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
            <span className="font-medium text-slate-700">Delivery method</span>
            <select
              id="deliveryMethod"
              name="deliveryMethod"
              defaultValue="local_delivery"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            >
              <option value="local_delivery">Local express delivery</option>
              <option value="branch_pickup">Store pickup</option>
              <option value="nationwide_shipping">Nationwide shipping</option>
            </select>
          </label>
          <label className="block text-sm" htmlFor="paymentMethod">
            <span className="font-medium text-slate-700">Payment method</span>
            <select
              id="paymentMethod"
              name="paymentMethod"
              defaultValue="cod"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
            >
              <option value="cod">Cash on delivery</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="momo">MoMo</option>
              <option value="vnpay">VNPAY</option>
            </select>
          </label>
        </div>
      </CheckoutPanel>
      <button
        type="button"
        disabled
        title="Order submission is wired through the checkout integration slice."
        className="min-h-11 w-full rounded-lg bg-red-600 px-4 text-sm font-semibold text-white opacity-70 disabled:cursor-not-allowed"
      >
        Place order
      </button>
    </form>
  );
}
