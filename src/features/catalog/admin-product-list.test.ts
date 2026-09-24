import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  buildProductsHref,
  getAdminProductsPage,
  parsePageParam,
  parseQueryParam,
  toOrFilterValue,
} from "./admin-product-list";

type Recorded = {
  or?: string;
  ilike?: [string, string];
  range?: [number, number];
  countOption?: unknown;
};

function productClient({
  rows = [] as unknown[],
  count = 0,
  skuMatches = [] as Array<{ product_id: string }>,
}) {
  const recorded: Recorded = {};

  const productBuilder = {
    select: vi.fn((_columns: string, options?: unknown) => {
      recorded.countOption = options;
      return productBuilder;
    }),
    or: vi.fn((filter: string) => {
      recorded.or = filter;
      return productBuilder;
    }),
    ilike: vi.fn((column: string, pattern: string) => {
      recorded.ilike = [column, pattern];
      return productBuilder;
    }),
    order: vi.fn(() => productBuilder),
    range: vi.fn((from: number, to: number) => {
      recorded.range = [from, to];
      return Promise.resolve({ data: rows, error: null, count });
    }),
  };

  const variantBuilder = {
    select: vi.fn(() => variantBuilder),
    ilike: vi.fn(() => variantBuilder),
    limit: vi.fn(() => Promise.resolve({ data: skuMatches, error: null })),
  };

  const client = {
    from: vi.fn((table: string) =>
      table === "products" ? productBuilder : variantBuilder,
    ),
  };

  return { client, recorded, productBuilder, variantBuilder };
}

describe("parsePageParam", () => {
  it.each([
    [undefined, 1],
    ["", 1],
    ["0", 1],
    ["-3", 1],
    ["abc", 1],
    ["4", 4],
  ])("parses %o as page %i", (input, expected) => {
    expect(parsePageParam(input as string | undefined)).toBe(expected);
  });

  it("takes the first value when the param repeats", () => {
    expect(parsePageParam(["2", "9"])).toBe(2);
  });
});

describe("parseQueryParam", () => {
  it("trims and tolerates a missing value", () => {
    expect(parseQueryParam("  tom su  ")).toBe("tom su");
    expect(parseQueryParam(undefined)).toBe("");
  });
});

describe("buildProductsHref", () => {
  it("omits empty query and first page", () => {
    expect(buildProductsHref("", 1)).toBe("/admin/products");
  });

  it("keeps the query while paging", () => {
    expect(buildProductsHref("tôm", 3)).toBe("/admin/products?q=t%C3%B4m&page=3");
  });
});

describe("toOrFilterValue", () => {
  it("quotes the pattern so PostgREST does not split on a comma or a dot", () => {
    expect(toOrFilterValue("%tom, cua%")).toBe('"%tom, cua%"');
    expect(toOrFilterValue('%a"b%')).toBe('"%ab%"');
  });
});

describe("getAdminProductsPage", () => {
  it("asks for an exact count and a bounded page instead of a flat limit", async () => {
    const { client, recorded } = productClient({ count: 114 });

    const result = await getAdminProductsPage(client as never, { query: "", page: 1 });

    expect(recorded.countOption).toEqual({ count: "exact" });
    expect(recorded.range).toEqual([0, ADMIN_PRODUCTS_PAGE_SIZE - 1]);
    expect(result.total).toBe(114);
    expect(result.pageCount).toBe(Math.ceil(114 / ADMIN_PRODUCTS_PAGE_SIZE));
  });

  it("reaches products beyond the first page, which the old 50-row cap hid entirely", async () => {
    const { client, recorded } = productClient({ count: 114 });

    await getAdminProductsPage(client as never, { query: "", page: 4 });

    expect(recorded.range).toEqual([
      3 * ADMIN_PRODUCTS_PAGE_SIZE,
      4 * ADMIN_PRODUCTS_PAGE_SIZE - 1,
    ]);
  });

  it("finds a product by a SKU read off the inventory screen", async () => {
    const { client, recorded } = productClient({
      skuMatches: [{ product_id: "p1" }, { product_id: "p1" }, { product_id: "p2" }],
      rows: [
        {
          id: "p1",
          name: "Bạch tuộc baby khay",
          slug: "bach-tuoc-baby-khay",
          status: "published",
          product_variants: [{ id: "v1", sku: "BABY_OCTOPUS_TRAY" }],
        },
      ],
      count: 1,
    });

    const result = await getAdminProductsPage(client as never, {
      query: "BABY_OCTOPUS_TRAY",
      page: 1,
    });

    expect(recorded.or).toBe(
      'name.ilike."%BABY_OCTOPUS_TRAY%",id.in.(p1,p2)',
    );
    expect(result.rows[0]).toEqual({
      id: "p1",
      name: "Bạch tuộc baby khay",
      slug: "bach-tuoc-baby-khay",
      sku: "BABY_OCTOPUS_TRAY",
      status: "published",
      variants: 1,
    });
  });

  it("falls back to a plain name search when no SKU matches", async () => {
    const { client, recorded } = productClient({ skuMatches: [], count: 0 });

    await getAdminProductsPage(client as never, { query: "cua xanh", page: 1 });

    expect(recorded.or).toBeUndefined();
    expect(recorded.ilike).toEqual(["name", "%cua xanh%"]);
  });

  it("reports at least one page when nothing matches", async () => {
    const { client } = productClient({ skuMatches: [], count: 0 });

    const result = await getAdminProductsPage(client as never, {
      query: "khong-co",
      page: 1,
    });

    expect(result.pageCount).toBe(1);
    expect(result.rows).toEqual([]);
  });
});
