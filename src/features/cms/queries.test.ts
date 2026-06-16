import { describe, expect, it, vi } from "vitest";
import {
  getHomePageContent,
  mapCmsProductCardRow,
  sortBySortOrder,
} from "./queries";

describe("CMS query helpers", () => {
  it("sorts rows by sort_order", () => {
    expect(
      sortBySortOrder([
        { sort_order: 20, label: "B" },
        { sort_order: 10, label: "A" },
      ]),
    ).toEqual([
      { sort_order: 10, label: "A" },
      { sort_order: 20, label: "B" },
    ]);
  });

  it("maps CMS product rows into dense product cards", () => {
    const card = mapCmsProductCardRow({
      badge_text: "Hot",
      products: {
        id: "p1",
        slug: "alaska-lobster-500g",
        name: "Alaska lobster 500g",
        product_images: [
          {
            url: "https://placehold.co/lobster",
            alt_text: "Lobster",
            sort_order: 0,
          },
        ],
        product_variants: [
          {
            id: "v1",
            sku: "ALASKA_LOBSTER_500G",
            unit: "1 con",
            option_summary: null,
            list_price: 745000,
            sale_price: 499000,
            is_active: true,
          },
        ],
      },
    });

    expect(card).toMatchObject({
      id: "p1",
      slug: "alaska-lobster-500g",
      name: "Alaska lobster 500g",
      imageUrl: "https://placehold.co/lobster",
      price: 499000,
      compareAtPrice: 745000,
      badgeText: "Hot",
      unitLabel: "1 con",
      isAvailable: true,
    });
  });

  it("throws when the product relation is missing", () => {
    expect(() =>
      mapCmsProductCardRow({
        badge_text: "Hot",
        products: null,
      }),
    ).toThrow("missing a product relation");
  });

  it("maps missing images to a null image URL", () => {
    const card = mapCmsProductCardRow({
      badge_text: null,
      products: {
        id: "p1",
        slug: "alaska-lobster-500g",
        name: "Alaska lobster 500g",
        product_images: [],
        product_variants: [
          {
            id: "v1",
            sku: "ALASKA_LOBSTER_500G",
            unit: "1 con",
            option_summary: null,
            list_price: 745000,
            sale_price: null,
            is_active: true,
          },
        ],
      },
    });

    expect(card.imageUrl).toBeNull();
  });

  it("throws when no variants are available to price the card", () => {
    expect(() =>
      mapCmsProductCardRow({
        badge_text: "Hot",
        products: {
          id: "p1",
          slug: "alaska-lobster-500g",
          name: "Alaska lobster 500g",
          product_images: [],
          product_variants: [],
        },
      }),
    ).toThrow("missing a display variant");
  });

  it("throws when all variants are inactive", () => {
    expect(() =>
      mapCmsProductCardRow({
        badge_text: "Hot",
        products: {
          id: "p1",
          slug: "alaska-lobster-500g",
          name: "Alaska lobster 500g",
          product_images: [],
          product_variants: [
            {
              id: "inactive",
              sku: "ALASKA_LOBSTER_INACTIVE",
              unit: "1 kg",
              option_summary: null,
              list_price: 900000,
              sale_price: null,
              is_active: false,
            },
          ],
        },
      }),
    ).toThrow("missing a display variant");
  });

  it("prefers an active variant over the first variant", () => {
    const card = mapCmsProductCardRow({
      badge_text: null,
      products: {
        id: "p1",
        slug: "alaska-lobster-500g",
        name: "Alaska lobster 500g",
        product_images: [],
        product_variants: [
          {
            id: "inactive",
            sku: "ALASKA_LOBSTER_INACTIVE",
            unit: "1 kg",
            option_summary: null,
            list_price: 900000,
            sale_price: null,
            is_active: false,
          },
          {
            id: "active",
            sku: "ALASKA_LOBSTER_ACTIVE",
            unit: "1 con",
            option_summary: null,
            list_price: 745000,
            sale_price: 499000,
            is_active: true,
          },
        ],
      },
    });

    expect(card.price).toBe(499000);
    expect(card.compareAtPrice).toBe(745000);
    expect(card.unitLabel).toBe("1 con");
  });

  it("uses the lowest active variant price deterministically", () => {
    const card = mapCmsProductCardRow({
      badge_text: null,
      products: {
        id: "p1",
        slug: "alaska-lobster-500g",
        name: "Alaska lobster 500g",
        product_images: [],
        product_variants: [
          {
            id: "larger",
            sku: "ALASKA_LOBSTER_1KG",
            unit: "1 kg",
            option_summary: null,
            list_price: 900000,
            sale_price: null,
            is_active: true,
          },
          {
            id: "smaller",
            sku: "ALASKA_LOBSTER_500G",
            unit: "500 g",
            option_summary: null,
            list_price: 745000,
            sale_price: 499000,
            is_active: true,
          },
        ],
      },
    });

    expect(card.price).toBe(499000);
    expect(card.compareAtPrice).toBe(745000);
    expect(card.unitLabel).toBe("500 g");
  });

  it("uses the first image by sort order", () => {
    const card = mapCmsProductCardRow({
      badge_text: null,
      products: {
        id: "p1",
        slug: "alaska-lobster-500g",
        name: "Alaska lobster 500g",
        product_images: [
          {
            url: "https://placehold.co/second",
            alt_text: "Second",
            sort_order: 20,
          },
          {
            url: "https://placehold.co/first",
            alt_text: "First",
            sort_order: 10,
          },
        ],
        product_variants: [
          {
            id: "v1",
            sku: "ALASKA_LOBSTER_500G",
            unit: "1 con",
            option_summary: null,
            list_price: 745000,
            sale_price: null,
            is_active: true,
          },
        ],
      },
    });

    expect(card.imageUrl).toBe("https://placehold.co/first");
  });

  it("sets isAvailable to true when at least one variant is active", () => {
    const card = mapCmsProductCardRow({
      badge_text: null,
      products: {
        id: "p1",
        slug: "alaska-lobster-500g",
        name: "Alaska lobster 500g",
        product_images: [],
        product_variants: [
          {
            id: "v1",
            sku: "ALASKA_LOBSTER_500G",
            unit: "1 con",
            option_summary: null,
            list_price: 745000,
            sale_price: null,
            is_active: true,
          },
        ],
      },
    });

    expect(card.isAvailable).toBe(true);
  });

  it("filters invalid section products from homepage content", async () => {
    const order = vi.fn().mockResolvedValue({
      error: null,
      data: [
        {
          id: "section-1",
          section_key: "best-sellers",
          section_type: "product_rail",
          title: "Best sellers",
          subtitle: null,
          layout: "grid",
          sort_order: 10,
          metadata: {},
          cms_banners: [],
          cms_section_products: [
            {
              sort_order: 10,
              badge_text: "Hot",
              products: {
                id: "valid",
                slug: "valid-product",
                name: "Valid product",
                product_images: [],
                product_variants: [
                  {
                    id: "v1",
                    sku: "VALID",
                    unit: "1 con",
                    option_summary: null,
                    list_price: 100000,
                    sale_price: null,
                    is_active: true,
                  },
                ],
              },
            },
            {
              sort_order: 20,
              badge_text: "Invalid",
              products: {
                id: "invalid",
                slug: "invalid-product",
                name: "Invalid product",
                product_images: [],
                product_variants: [],
              },
            },
            {
              sort_order: 30,
              badge_text: "Missing",
              products: null,
            },
          ],
        },
      ],
    });
    const eqActive = vi.fn().mockReturnValue({ order });
    const eqPage = vi.fn().mockReturnValue({ eq: eqActive });
    const select = vi.fn().mockReturnValue({ eq: eqPage });
    const from = vi.fn().mockReturnValue({ select });

    const content = await getHomePageContent({ from } as never);

    expect(content.sections[0]?.products).toHaveLength(1);
    expect(content.sections[0]?.products[0]?.id).toBe("valid");
  });
});
