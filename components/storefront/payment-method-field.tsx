"use client";

import { useState } from "react";
import type { CmsBrandAsset } from "@/src/features/cms/types";
import { BankTransferInfo } from "./bank-transfer-info";

type PaymentMethodFieldProps = {
  bankAccounts: CmsBrandAsset[];
};

export function PaymentMethodField({ bankAccounts }: PaymentMethodFieldProps) {
  const [method, setMethod] = useState("cod");

  return (
    <>
      <label className="block text-sm" htmlFor="paymentMethod">
        <span className="font-medium text-slate-700">Phương thức thanh toán</span>
        <select
          id="paymentMethod"
          name="paymentMethod"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600"
        >
          <option value="cod">Tiền mặt khi nhận hàng</option>
          <option value="bank_transfer">Chuyển khoản ngân hàng</option>
          <option value="momo">MoMo</option>
          <option value="vnpay">VNPAY</option>
        </select>
      </label>
      {method === "bank_transfer" && bankAccounts.length > 0 && (
        <div className="md:col-span-2" data-testid="checkout-bank-transfer">
          <p className="mb-2 text-sm text-slate-600">
            Chuyển khoản theo thông tin bên dưới. Ghi mã đơn hàng (hiện sau khi đặt) vào nội dung
            chuyển khoản.
          </p>
          <BankTransferInfo accounts={bankAccounts} />
        </div>
      )}
    </>
  );
}
