import { describe, expect, it } from "vitest";
import { createProductJsonLd } from "./product-json-ld";

describe("createProductJsonLd", () => {
  it("creates Product structured data", () => {
    const jsonLd = createProductJsonLd({
      name: "Ca hoi sashimi",
      description: "Fresh salmon sashimi",
      imageUrl: "https://example.com/salmon.jpg",
      price: 129000,
      currency: "VND",
      availability: "InStock",
    });

    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.offers.price).toBe(129000);
  });
});
