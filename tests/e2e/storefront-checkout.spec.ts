import { expect, type Page, test } from "@playwright/test";

async function expectFullHomepageRefreshSections(page: Page): Promise<void> {
  await expect(page.getByText("Gợi ý cho bạn")).toBeVisible();
  await expect(page.getByText("Thông tin hữu ích")).toBeVisible();
  await expect(page.getByText("Đối tác Dao Seafood")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Thanh toán", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cam kết", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Thông tin công ty", exact: true }),
  ).toBeVisible();
}

async function expectTemplateInspiredTheme(page: Page): Promise<void> {
  const shell = page.getByTestId("storefront-home-shell");
  await expect(shell).toHaveAttribute("data-theme", "seafood-market-v2");
  await expect(shell).toHaveCSS("background-color", "rgb(242, 247, 245)");

  await expect(page.getByRole("banner")).toHaveAttribute(
    "data-visual-treatment",
    "market-template",
  );

  await expect(page.getByTestId("homepage-product-card").first()).toHaveCSS(
    "border-radius",
    "8px",
  );
  await expect(
    page.getByTestId("storefront-generated-placeholder").first(),
  ).toBeVisible();
  await expect
    .poll(() => page.locator('main img[src*="placehold.co"]').count())
    .toBe(0);
}

test.describe("storefront checkout smoke", () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1200 },
  ]) {
    test(`storefront homepage renders at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "Chợ hải sản hôm nay" }),
      ).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();

      const productCards = page.getByTestId("homepage-product-card");
      await expect
        .poll(() => productCards.count())
        .toBeGreaterThanOrEqual(24);

      await expectFullHomepageRefreshSections(page);
      await expectTemplateInspiredTheme(page);

      if (viewport.width >= 1024) {
        const categories = page.getByRole("complementary", {
          name: "Danh mục hải sản",
        });

        await expect(categories).toBeVisible();
        await expect
          .poll(() => categories.getByRole("link").count())
          .toBeGreaterThanOrEqual(10);
      }
      await page.screenshot({
        path: `test-results/storefront-home-${viewport.width}.png`,
        fullPage: true,
      });
    });
  }

  test("loads core storefront routes and checkout form", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Dao Seafood", exact: true }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Tìm hải sản")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "1900 0098", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Chợ hải sản hôm nay" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Bán chạy" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Flash sale hải sản" }),
    ).toBeVisible();
    await expect(page.getByText("Kết thúc sau")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Hải sản giá tốt từ 29K",
      }),
    ).toBeVisible();
    await expect(
      page
        .getByLabel("Hải sản giá tốt từ 29K", { exact: true })
        .getByText("Hải sản từ 29K"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Sushi & sashimi" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Hải sản đông lạnh" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Món chế biến sẵn" }),
    ).toBeVisible();
    await expectFullHomepageRefreshSections(page);

    await page.goto("/search?q=tom");
    await expect(page.getByPlaceholder("Tim san pham")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tim" })).toBeVisible();

    await page.goto("/search?q=salmon");
    await expect(
      page.getByRole("heading", { name: /Search results/i }),
    ).toBeVisible();
    await expect(page.getByText("Sort")).toBeVisible();

    await page.goto("/categories/sashimi");
    await expect(page.getByRole("heading", { name: /sashimi/i })).toBeVisible();
    await expect(page.getByText("Filter")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Shopping cart" })).toBeVisible();
    await expect(page.getByText("Order minimum notice")).toBeVisible();
    await expect(page.getByRole("link", { name: "Checkout" })).toBeVisible();

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByLabel("Receiver name")).toBeVisible();
    await expect(page.getByLabel("Payment method")).toBeVisible();
    await expect(page.getByRole("button", { name: "Place order" })).toBeVisible();
  });
});
