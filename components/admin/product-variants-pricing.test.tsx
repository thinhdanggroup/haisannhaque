import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/src/features/catalog/admin-actions", () => ({
  createProductVariant: vi.fn(),
  updateVariantPricing: vi.fn(),
}));

import { ProductVariantsPricing } from "./product-variants-pricing";

const productId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const variant = {
  id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  sku: "MAM-001",
  unit: "hũ",
  optionSummary: "Hũ 500g",
  listPrice: 120000,
  salePrice: null,
  isActive: true,
};

describe("ProductVariantsPricing", () => {
  it("offers the add-variant form when the product has no variants", () => {
    render(<ProductVariantsPricing productId={productId} variants={[]} />);

    expect(screen.getByText(/Chưa có biến thể nào/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thêm biến thể" })).toBeTruthy();
    expect(
      screen.getByRole("spinbutton", { name: /Giá niêm yết/ }).hasAttribute("required"),
    ).toBe(true);
  });

  it("explains that a variant-less product stays hidden from the storefront", () => {
    render(<ProductVariantsPricing productId={productId} variants={[]} />);

    expect(screen.getByText(/không hiển thị trên web/)).toBeTruthy();
  });

  it("still offers the add-variant form alongside existing variants", () => {
    render(<ProductVariantsPricing productId={productId} variants={[variant]} />);

    expect(screen.getByRole("button", { name: "Lưu giá" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thêm biến thể" })).toBeTruthy();
  });

  it("carries the product id in both forms", () => {
    const { container } = render(
      <ProductVariantsPricing productId={productId} variants={[variant]} />,
    );

    const hidden = container.querySelectorAll('input[name="productId"]');
    expect(hidden).toHaveLength(2);
    hidden.forEach((input) => expect((input as HTMLInputElement).value).toBe(productId));
  });
});
