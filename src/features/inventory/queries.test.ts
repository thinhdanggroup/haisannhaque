import { describe, expect, it } from "vitest";

import { getAdminInventoryRows } from "./queries";

describe("getAdminInventoryRows", () => {
  it("maps bulk inventory RPC rows for admin tables", async () => {
    const rpcCalls: string[] = [];
    const client = {
      rpc: async (name: string) => {
        rpcCalls.push(name);

        return {
          data: [
            {
              sku: "TOM-SU-500G",
              product_name: "Tom su",
              warehouse_code: "HCM-01",
              warehouse_name: "Primary warehouse",
              available_quantity: "12.5",
              unit: "kg",
              quality: "sellable",
            },
          ],
          error: null,
        };
      },
    };

    await expect(getAdminInventoryRows(client as never)).resolves.toEqual([
      {
        sku: "TOM-SU-500G",
        product: "Tom su",
        warehouse: "HCM-01 - Primary warehouse",
        available: "12,5",
        unit: "kg",
        quality: "sellable",
      },
    ]);
    expect(rpcCalls).toEqual(["get_admin_inventory_rows"]);
  });
});
