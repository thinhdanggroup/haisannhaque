import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FlashSaleForm } from "@/components/admin/flash-sale-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { createFlashSaleEvent } from "@/src/features/flash-sales/admin-actions";
import { getProductsForSelector } from "@/src/features/flash-sales/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewFlashSalePage() {
  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="Flash Sale mới" />
        <FlashSaleForm action={createFlashSaleEvent} products={[]} />
      </div>
    );
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "flash_sales:manage");
    const products = await getProductsForSelector(client);

    return (
      <div>
        <AdminPageHeader title="Flash Sale mới" />
        <FlashSaleForm action={createFlashSaleEvent} products={products} />
      </div>
    );
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Flash Sale mới" />
          <p className="text-sm text-slate-600">Bạn không có quyền tạo flash sale.</p>
        </div>
      );
    }
    throw e;
  }
}
