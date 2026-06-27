import Link from "next/link";
import type { CartTotals } from "@/src/features/cart/types";

type CartSummaryProps = {
  totals: CartTotals;
};

function formatCurrency(value: number): string {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function CartSummary({ totals }: CartSummaryProps) {
  return (
    <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Tóm tắt đơn hàng</h2>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">Tạm tính</span>
          <span className="font-medium text-slate-950">
            {formatCurrency(totals.subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">Giảm giá</span>
          <span className="font-medium text-slate-950">
            {formatCurrency(totals.discountTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">Phí giao hàng</span>
          <span className="font-medium text-slate-950">
            {formatCurrency(totals.shippingTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-base font-semibold">
          <span>Tổng cộng</span>
          <span className="text-red-600">{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>
      <p className="mt-4 rounded-md bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
        Lưu ý đơn hàng tối thiểu
      </p>
      <Link
        href="/checkout"
        className="mt-5 flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Thanh toán
      </Link>
    </aside>
  );
}
