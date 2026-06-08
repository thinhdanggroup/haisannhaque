import { describe, expect, it, vi } from "vitest";
import {
  getDailySalesReport,
  getExpiringStockReport,
  getLowStockReport,
  getProductSalesReport,
  getPromotionUsageReport,
  getPurchaseOrdersReport,
  getRefundsReport,
  getStockAdjustmentsReport,
} from "./queries";

describe("getDailySalesReport", () => {
  it("calls the daily sales report RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ report_date: "2026-06-07", order_count: 2, revenue_total: 258000 }],
      error: null,
    });

    const result = await getDailySalesReport({ rpc }, "2026-06-01", "2026-06-07");

    expect(rpc).toHaveBeenCalledWith("get_daily_sales_report", {
      input_from_date: "2026-06-01",
      input_to_date: "2026-06-07",
    });
    expect(result).toHaveLength(1);
  });

  it("throws RPC errors", async () => {
    const error = new Error("report failed");
    const rpc = vi.fn().mockResolvedValue({ data: null, error });

    await expect(
      getDailySalesReport({ rpc }, "2026-06-01", "2026-06-07"),
    ).rejects.toThrow(error);
  });

  it("wraps all Task 12 report RPCs", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });

    await getProductSalesReport({ rpc }, "2026-06-01", "2026-06-07");
    await getPromotionUsageReport({ rpc }, "2026-06-01", "2026-06-07");
    await getLowStockReport({ rpc }, 5);
    await getExpiringStockReport({ rpc }, 7);
    await getStockAdjustmentsReport({ rpc }, "2026-06-01", "2026-06-07");
    await getPurchaseOrdersReport({ rpc }, "2026-06-01", "2026-06-07");
    await getRefundsReport({ rpc }, "2026-06-01", "2026-06-07");

    expect(rpc).toHaveBeenCalledWith("get_product_sales_report", {
      input_from_date: "2026-06-01",
      input_to_date: "2026-06-07",
    });
    expect(rpc).toHaveBeenCalledWith("get_promotion_usage_report", {
      input_from_date: "2026-06-01",
      input_to_date: "2026-06-07",
    });
    expect(rpc).toHaveBeenCalledWith("get_low_stock_report", {
      input_threshold: 5,
    });
    expect(rpc).toHaveBeenCalledWith("get_expiring_stock_report", {
      input_days: 7,
    });
    expect(rpc).toHaveBeenCalledWith("get_stock_adjustments_report", {
      input_from_date: "2026-06-01",
      input_to_date: "2026-06-07",
    });
    expect(rpc).toHaveBeenCalledWith("get_purchase_orders_report", {
      input_from_date: "2026-06-01",
      input_to_date: "2026-06-07",
    });
    expect(rpc).toHaveBeenCalledWith("get_refunds_report", {
      input_from_date: "2026-06-01",
      input_to_date: "2026-06-07",
    });
  });
});
