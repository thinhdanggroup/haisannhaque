import { describe, expect, it } from "vitest";
import { canAccess } from "./permissions";

describe("canAccess", () => {
  it("allows super admin to access all resources", () => {
    expect(canAccess(["super_admin"], "orders:update")).toBe(true);
  });

  it("allows catalog manager to manage products", () => {
    expect(canAccess(["catalog_manager"], "products:update")).toBe(true);
  });

  it("blocks catalog manager from refunds", () => {
    expect(canAccess(["catalog_manager"], "refunds:create")).toBe(false);
  });

  it("allows customer service to manage complaints", () => {
    expect(canAccess(["customer_service"], "complaints:update")).toBe(true);
  });

  it("allows catalog manager to manage shop sync", () => {
    expect(canAccess(["catalog_manager"], "shop_sync:manage")).toBe(true);
  });

  it("blocks customer service from shop sync", () => {
    expect(canAccess(["customer_service"], "shop_sync:manage")).toBe(false);
  });
});
