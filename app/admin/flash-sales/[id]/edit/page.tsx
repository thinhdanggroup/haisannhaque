import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FlashSaleForm } from "@/components/admin/flash-sale-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { updateFlashSaleEvent } from "@/src/features/flash-sales/admin-actions";
import {
  getFlashSaleEvent,
  getFlashSaleEventProductIds,
  getProductsForSelector,
} from "@/src/features/flash-sales/queries";
import { createServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

type EditFlashSalePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditFlashSalePage({ params }: EditFlashSalePageProps) {
  const { id } = await params;

  if (shouldUseAdminPlaywrightFixture()) {
    return (
      <div>
        <AdminPageHeader title="Sửa Flash Sale" />
        <FlashSaleForm action={updateFlashSaleEvent} products={[]} />
      </div>
    );
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "flash_sales:manage");

    const [event, selectedProductIds, products] = await Promise.all([
      getFlashSaleEvent(client, id),
      getFlashSaleEventProductIds(client, id),
      getProductsForSelector(client),
    ]);

    if (!event) notFound();

    return (
      <div>
        <AdminPageHeader title="Sửa Flash Sale" />
        <FlashSaleForm
          action={updateFlashSaleEvent}
          products={products}
          initialValues={{
            id: event.id,
            name: event.name,
            discountPct: event.discountPct,
            startAt: event.startAt,
            endAt: event.endAt,
            isActive: event.isActive,
            selectedProductIds,
          }}
        />
      </div>
    );
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Sửa Flash Sale" />
          <p className="text-sm text-slate-600">Bạn không có quyền sửa flash sale.</p>
        </div>
      );
    }
    throw e;
  }
}
