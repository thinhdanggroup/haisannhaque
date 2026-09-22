import { describe, expect, it } from "vitest";

import {
  ADMIN_INVENTORY_PAGE_SIZE,
  buildInventoryHref,
  getAdminInventoryRows,
  parsePageParam,
  parseQueryParam,
} from "./queries";

function rpcClient(row: Record<string, unknown>) {
  const rpcCalls: Array<{ name: string; args: unknown }> = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });

      return { data: [row], error: null };
    },
  };

  return { client, rpcCalls };
}

describe("getAdminInventoryRows", () => {
  it("maps bulk inventory RPC rows for admin tables", async () => {
    const { client, rpcCalls } = rpcClient({
      sku: "TOM-SU-500G",
      product_name: "Tom su",
      warehouse_code: "HCM-01",
      warehouse_name: "Primary warehouse",
      available_quantity: "12.5",
      unit: "kg",
      quality: "sellable",
      total_variant_count: 1,
    });

    const result = await getAdminInventoryRows(client as never, { query: "", page: 1 });

    expect(result.rows).toEqual([
      {
        sku: "TOM-SU-500G",
        product: "Tom su",
        warehouse: "HCM-01 - Primary warehouse",
        warehouseCode: "HCM-01",
        available: "12,5",
        unit: "kg",
        quality: "sellable",
      },
    ]);
    expect(result.total).toBe(1);
    expect(result.pageCount).toBe(1);
    expect(rpcCalls).toEqual([
      {
        name: "get_admin_inventory_rows",
        args: {
          input_search: null,
          input_page: 1,
          input_page_size: ADMIN_INVENTORY_PAGE_SIZE,
        },
      },
    ]);
  });

  it("reaches SKUs beyond the first page, which the old 100-SKU cap hid entirely", async () => {
    const { client, rpcCalls } = rpcClient({
      sku: "TOM-CANG-SEN-01",
      product_name: "Tôm càng sen",
      warehouse_code: "HCM-01",
      warehouse_name: "Primary warehouse",
      available_quantity: 0,
      unit: "kg",
      quality: "sellable",
      total_variant_count: 114,
    });

    const result = await getAdminInventoryRows(client as never, { query: "", page: 5 });

    expect(result.total).toBe(114);
    expect(result.pageCount).toBe(Math.ceil(114 / ADMIN_INVENTORY_PAGE_SIZE));
    expect(rpcCalls[0].args).toMatchObject({ input_page: 5 });
  });

  it("passes a non-empty query through as the RPC search term", async () => {
    const { client, rpcCalls } = rpcClient({
      sku: "TOM-CANG-SEN-01",
      product_name: "Tôm càng sen",
      warehouse_code: "HCM-01",
      warehouse_name: "Primary warehouse",
      available_quantity: 0,
      unit: "kg",
      quality: "sellable",
      total_variant_count: 1,
    });

    await getAdminInventoryRows(client as never, { query: "tôm càng sen", page: 1 });

    expect(rpcCalls[0].args).toMatchObject({ input_search: "tôm càng sen" });
  });

  it("reports at least one page when nothing matches", async () => {
    const client = { rpc: async () => ({ data: [], error: null }) };

    const result = await getAdminInventoryRows(client as never, {
      query: "khong-co",
      page: 1,
    });

    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.pageCount).toBe(1);
  });
});

describe("parsePageParam", () => {
  it.each([
    [undefined, 1],
    ["", 1],
    ["0", 1],
    ["-3", 1],
    ["abc", 1],
    ["4", 4],
  ])("parses %o as page %i", (input, expected) => {
    expect(parsePageParam(input as string | undefined)).toBe(expected);
  });
});

describe("parseQueryParam", () => {
  it("trims and tolerates a missing value", () => {
    expect(parseQueryParam("  tom su  ")).toBe("tom su");
    expect(parseQueryParam(undefined)).toBe("");
  });
});

describe("buildInventoryHref", () => {
  it("omits empty query and first page", () => {
    expect(buildInventoryHref("", 1)).toBe("/admin/inventory");
  });

  it("keeps the query while paging", () => {
    expect(buildInventoryHref("tôm", 3)).toBe("/admin/inventory?q=t%C3%B4m&page=3");
  });
});
