import { expect, test } from "@playwright/test";

test.describe("admin operations smoke", () => {
  test("admin dashboard renders dense desktop layout", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Operations dashboard" })).toBeVisible();
    await page.screenshot({
      path: "test-results/admin-dashboard-desktop.png",
      fullPage: true,
    });
  });

  test("renders dashboard and order list", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Operations dashboard" })).toBeVisible();
    await expect(page.getByText("Branch context")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin modules" })).toBeVisible();
    await expect(page.getByText("Open orders")).toBeVisible();

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    await expect(page.getByText("No orders yet.")).toBeVisible();

    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
    await expect(page.getByText("No products created yet.")).toBeVisible();

    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
    await expect(page.getByText("No inventory records yet.")).toBeVisible();
  });

  test("renders protected admin sections without crashing", async ({ page }) => {
    await page.goto("/admin/purchase-orders");
    await expect(page.getByRole("heading", { name: "Purchase Orders" })).toBeVisible();
    await expect(page.getByText("Procurement queue")).toBeVisible();

    await page.goto("/admin/refunds");
    await expect(page.getByRole("heading", { name: "Refunds" })).toBeVisible();
    await expect(page.getByText("Finance queue")).toBeVisible();

    await page.goto("/admin/complaints");
    await expect(page.getByRole("heading", { name: "Complaints" })).toBeVisible();
    await expect(page.getByText("Support queue")).toBeVisible();

    await page.goto("/admin/content");
    await expect(page.getByRole("heading", { name: "Content" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "CMS sections" })).toBeVisible();

    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByText("Last 7 days")).toBeVisible();
  });
});
