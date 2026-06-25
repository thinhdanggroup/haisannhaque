import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MetricTile } from "@/components/admin/metric-tile";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import {
  type DashboardMetric,
  createDashboardMetrics,
  getAdminDashboardMetrics,
  shouldUseAdminPlaywrightFixture,
} from "@/src/features/admin/dashboard";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type DashboardPageData =
  | { access: "allowed"; metrics: DashboardMetric[] }
  | { access: "denied" };

async function getDashboardPageData(): Promise<DashboardPageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return {
      access: "allowed",
      metrics: createDashboardMetrics({
        openOrders: 0,
        lowStockSkus: 0,
        pendingRefunds: 0,
        openComplaints: 0,
        purchaseOrders: 0,
        revenueToday: 0,
      }),
    };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "*");
    const metrics = await getAdminDashboardMetrics(client);

    return { access: "allowed", metrics };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { access: "denied" };
    }

    throw error;
  }
}

export default async function AdminDashboardPage() {
  const pageData = await getDashboardPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Bảng điều hành" />
        <p className="text-sm text-slate-600">Bạn không có quyền truy cập bảng điều hành.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Bảng điều hành"
        description="Số liệu vận hành trực tiếp về đơn hàng, kho hàng, hỗ trợ, mua hàng và doanh số."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pageData.metrics.map((metric) => (
          <MetricTile
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
          />
        ))}
      </div>
    </div>
  );
}
