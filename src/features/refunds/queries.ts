import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminRefundRow = {
  orderNo: string;
  amount: string;
  method: string;
  status: string;
  reason: string;
};

type RefundQueryClient = Pick<SupabaseClient, "rpc">;

type AdminRefundRpcRow = {
  order_no: string | null;
  amount: number | string;
  refund_method: string;
  status: string;
  reason: string;
};

export async function getAdminRefundRows(
  client: RefundQueryClient,
): Promise<AdminRefundRow[]> {
  const { data, error } = await client.rpc("get_admin_refund_rows");

  if (error) {
    throw error;
  }

  return ((data ?? []) as AdminRefundRpcRow[]).map((refund) => ({
    orderNo: refund.order_no ?? "",
    amount: String(refund.amount),
    method: refund.refund_method,
    status: refund.status,
    reason: refund.reason,
  }));
}
