import { describe, expect, it } from "vitest";
import { mapProductRowToCard } from "./queries";

describe("mapProductRowToCard", () => {
  it("uses sale price when available", () => {
    const card = mapProductRowToCard({
      id: "product-1",
      slug: "ca-hoi-sashimi",
      name: "Ca hoi sashimi",
      image_url: "/salmon.jpg",
      list_price: 150000,
      sale_price: 129000,
      unit: "500g",
      is_available: true,
      default_variant_id: "variant-1",
    });

    expect(card.price).toBe(129000);
    expect(card.compareAtPrice).toBe(150000);
    expect(card.unitLabel).toBe("500g");
    expect(card.defaultVariantId).toBe("variant-1");
  });

  it("uses list price when sale price is missing", () => {
    const card = mapProductRowToCard({
      id: "product-2",
      slug: "tom-hum",
      name: "Tom hum",
      image_url: null,
      list_price: 450000,
      sale_price: null,
      unit: null,
      is_available: false,
      default_variant_id: null,
    });

    expect(card.price).toBe(450000);
    expect(card.compareAtPrice).toBeNull();
    expect(card.unitLabel).toBeNull();
  });
});
