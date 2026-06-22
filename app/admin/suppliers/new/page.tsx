import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupplierForm } from "@/components/admin/supplier-form";
import { createSupplier } from "@/src/features/procurement/supplier-actions";

export const dynamic = "force-dynamic";

export default function NewSupplierPage() {
  return (
    <div>
      <AdminPageHeader title="New supplier" />
      <SupplierForm action={createSupplier} />
    </div>
  );
}
