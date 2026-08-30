const rolePermissions: Record<string, string[]> = {
  super_admin: ["*"],
  catalog_manager: [
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "categories:update",
    "shop_sync:manage",
  ],
  marketing: ["cms:update", "promotions:update", "flash_sales:manage"],
  customer_service: [
    "orders:read",
    "orders:update",
    "customers:read",
    "complaints:read",
    "complaints:update",
  ],
  warehouse: ["inventory:read", "inventory:update", "orders:fulfill"],
  procurement: ["purchase_orders:read", "purchase_orders:update", "suppliers:update"],
  finance: ["payments:read", "refunds:create", "reports:read"],
  reporter: ["reports:read"],
};

export function canAccess(roles: string[], permission: string): boolean {
  return roles.some((role) => {
    const permissions = rolePermissions[role] ?? [];
    return permissions.includes("*") || permissions.includes(permission);
  });
}
