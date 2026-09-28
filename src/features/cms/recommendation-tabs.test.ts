import { describe, expect, it } from "vitest";
import {
  collectTabProductIds,
  parseRecommendationTabs,
  recommendationTabsInputSchema,
  selectTabProducts,
} from "./recommendation-tabs";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("parseRecommendationTabs", () => {
  it("reads legacy tabs that have no product list", () => {
    const tabs = parseRecommendationTabs({
      tabs: [{ key: "party", label: "Cuối tuần đãi khách" }],
    });
    expect(tabs).toEqual([
      { key: "party", label: "Cuối tuần đãi khách", href: null, productIds: [] },
    ]);
  });

  it("drops tabs without a label and unsafe hrefs", () => {
    const tabs = parseRecommendationTabs({
      tabs: [{ label: "" }, { label: "Ngoài", href: "https://evil.test" }, "junk"],
    });
    expect(tabs).toEqual([{ key: "tab-2", label: "Ngoài", href: null, productIds: [] }]);
  });

  it("returns no tabs when metadata has none", () => {
    expect(parseRecommendationTabs({})).toEqual([]);
  });
});

describe("selectTabProducts", () => {
  const products = [{ id: A }, { id: B }, { id: C }];

  it("returns the tab's products in the tab's order", () => {
    expect(selectTabProducts({ productIds: [C, A] }, products)).toEqual([{ id: C }, { id: A }]);
  });

  it("skips products that no longer load", () => {
    expect(selectTabProducts({ productIds: ["missing", B] }, products)).toEqual([{ id: B }]);
  });

  it("falls back to every section product when the tab has none", () => {
    expect(selectTabProducts({ productIds: [] }, products)).toEqual(products);
  });
});

describe("recommendationTabsInputSchema", () => {
  it("rejects duplicate keys", () => {
    const result = recommendationTabsInputSchema.safeParse([
      { key: "a", label: "A", href: "", productIds: [] },
      { key: "a", label: "B", href: "", productIds: [] },
    ]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("trùng");
  });

  it("rejects external links", () => {
    const result = recommendationTabsInputSchema.safeParse([
      { key: "a", label: "A", href: "//evil.test", productIds: [] },
    ]);
    expect(result.success).toBe(false);
  });

  it("accepts a valid tab list", () => {
    const result = recommendationTabsInputSchema.safeParse([
      { key: "party", label: " Đãi khách ", href: "", productIds: [A, B] },
    ]);
    expect(result.success).toBe(true);
    expect(result.data?.[0]?.label).toBe("Đãi khách");
  });
});

describe("collectTabProductIds", () => {
  it("dedupes products across tabs keeping first-seen order", () => {
    expect(collectTabProductIds([{ productIds: [B, A] }, { productIds: [A, C] }])).toEqual([
      B,
      A,
      C,
    ]);
  });
});
