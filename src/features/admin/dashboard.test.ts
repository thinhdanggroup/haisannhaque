import { describe, expect, it } from "vitest";

import { createDashboardMetrics, getAdminDashboardMetrics } from "./dashboard";

describe("createDashboardMetrics", () => {
  it("formats operations metrics", () => {
    expect(
      createDashboardMetrics({
        openOrders: 2,
        lowStockSkus: 3,
        pendingRefunds: 1,
        openComplaints: 4,
        purchaseOrders: 5,
        revenueToday: 1250000,
      }),
    ).toEqual([
      { label: "Open orders", value: "2", detail: "Needs review" },
      { label: "Low stock SKUs", value: "3", detail: "Below threshold" },
      { label: "Pending refunds", value: "1", detail: "Finance queue" },
      { label: "Open complaints", value: "4", detail: "Support queue" },
      { label: "Purchase orders", value: "5", detail: "Procurement" },
      { label: "Sales today", value: "1,250,000d", detail: "Completed orders" },
    ]);
  });

  it("reads dashboard metrics from the aggregate RPC", async () => {
    const rpcCalls: string[] = [];
    const client = {
      rpc: async (name: string) => {
        rpcCalls.push(name);

        return {
          data: [
            {
              open_order_count: "2",
              low_stock_sku_count: "3",
              pending_refund_count: "1",
              open_complaint_count: "4",
              purchase_order_count: "5",
              revenue_today: "1250000",
            },
          ],
          error: null,
        };
      },
    };

    await expect(getAdminDashboardMetrics(client as never)).resolves.toEqual([
      { label: "Open orders", value: "2", detail: "Needs review" },
      { label: "Low stock SKUs", value: "3", detail: "Below threshold" },
      { label: "Pending refunds", value: "1", detail: "Finance queue" },
      { label: "Open complaints", value: "4", detail: "Support queue" },
      { label: "Purchase orders", value: "5", detail: "Procurement" },
      { label: "Sales today", value: "1,250,000d", detail: "Completed orders" },
    ]);
    expect(rpcCalls).toEqual(["get_admin_dashboard_metrics"]);
  });
});
