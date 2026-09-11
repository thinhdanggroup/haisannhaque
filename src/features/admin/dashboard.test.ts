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
      { label: "Đơn chờ xử lý", value: "2", detail: "Cần xem xét" },
      { label: "SKU sắp hết hàng", value: "3", detail: "Dưới ngưỡng" },
      { label: "Hoàn tiền chờ xử lý", value: "1", detail: "Hàng đợi tài chính" },
      { label: "Khiếu nại đang mở", value: "4", detail: "Hàng đợi hỗ trợ" },
      { label: "Đơn nhập hàng", value: "5", detail: "Mua hàng" },
      { label: "Doanh số hôm nay", value: "1,250,000d", detail: "Đơn hoàn thành" },
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
      { label: "Đơn chờ xử lý", value: "2", detail: "Cần xem xét" },
      { label: "SKU sắp hết hàng", value: "3", detail: "Dưới ngưỡng" },
      { label: "Hoàn tiền chờ xử lý", value: "1", detail: "Hàng đợi tài chính" },
      { label: "Khiếu nại đang mở", value: "4", detail: "Hàng đợi hỗ trợ" },
      { label: "Đơn nhập hàng", value: "5", detail: "Mua hàng" },
      { label: "Doanh số hôm nay", value: "1,250,000d", detail: "Đơn hoàn thành" },
    ]);
    expect(rpcCalls).toEqual(["get_admin_dashboard_metrics"]);
  });
});
