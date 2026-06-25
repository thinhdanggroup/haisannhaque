import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Bảng điều hành" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/content", label: "Nội dung" },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/inventory", label: "Tồn kho" },
  { href: "/admin/warehouses", label: "Kho hàng" },
  { href: "/admin/purchase-orders", label: "Đơn nhập hàng" },
  { href: "/admin/suppliers", label: "Nhà cung cấp" },
  { href: "/admin/refunds", label: "Hoàn tiền" },
  { href: "/admin/complaints", label: "Khiếu nại" },
  { href: "/admin/reports", label: "Báo cáo" },
];

export function AdminNav() {
  return (
    <nav aria-label="Admin modules" className="space-y-1">
      {adminLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
