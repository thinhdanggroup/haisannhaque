import { expect, test } from "@playwright/test";

test.describe("admin shop sync", () => {
  test("renders the shop sync settings page", async ({ page }) => {
    await page.goto("/admin/shop-sync");
    await expect(page.getByRole("heading", { name: "Đồng bộ ShopeeFood" })).toBeVisible();
    await expect(page.getByLabel("URL shop ShopeeFood")).toBeVisible();
    await expect(page.getByText("Chưa có lượt đồng bộ nào.")).toBeVisible();
  });

  test("shop sync link appears in the admin nav", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Đồng bộ ShopeeFood" })).toBeVisible();
  });
});
