import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductPreviewLink } from "./product-preview-link";

describe("ProductPreviewLink", () => {
  it("opens the storefront detail page in a new tab for a published product", () => {
    render(<ProductPreviewLink slug="muc-mot-nang" status="published" />);

    const link = screen.getByRole("link", { name: "Xem trước" });
    expect(link.getAttribute("href")).toBe("/products/muc-mot-nang");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("is disabled for a draft, which the storefront would 404", () => {
    render(<ProductPreviewLink slug="muc-mot-nang" status="draft" />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Xem trước").getAttribute("aria-disabled")).toBe("true");
  });
});
