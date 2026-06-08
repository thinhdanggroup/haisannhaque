import { describe, expect, it } from "vitest";

import { getAdminRefundRows } from "./queries";

describe("getAdminRefundRows", () => {
  it("reads refund rows through the finance-scoped RPC", async () => {
    const rpcCalls: string[] = [];
    const client = {
      rpc: async (name: string) => {
        rpcCalls.push(name);

        return {
          data: [
            {
              order_no: "DHS-1001",
              amount: "150000",
              refund_method: "bank_transfer",
              status: "requested",
              reason: "Customer changed order",
            },
          ],
          error: null,
        };
      },
    };

    await expect(getAdminRefundRows(client as never)).resolves.toEqual([
      {
        orderNo: "DHS-1001",
        amount: "150000",
        method: "bank_transfer",
        status: "requested",
        reason: "Customer changed order",
      },
    ]);
    expect(rpcCalls).toEqual(["get_admin_refund_rows"]);
  });
});
