import { describe, it, expect } from "vitest";
import { validateCategoryInput } from "./category-actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("category actions (validation)", () => {
  it("returns error when slug is empty", () => {
    const fd = makeFormData({ slug: "", name: "Dairy" });
    const result = validateCategoryInput(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("required");
    }
  });

  it("returns error when slug has uppercase", () => {
    const fd = makeFormData({ slug: "Dairy-Products", name: "Dairy" });
    const result = validateCategoryInput(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("lowercase");
    }
  });

  it("returns error when slug has spaces", () => {
    const fd = makeFormData({ slug: "dairy products", name: "Dairy" });
    const result = validateCategoryInput(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("lowercase");
    }
  });

  it("returns error when name is empty", () => {
    const fd = makeFormData({ slug: "dairy", name: "" });
    const result = validateCategoryInput(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("required");
    }
  });

  it("accepts valid category input", () => {
    const fd = makeFormData({
      slug: "dairy-products",
      name: "Dairy Products",
      description: "Fresh dairy items",
      imageUrl: "https://example.com/dairy.jpg",
      sortOrder: "1",
      isActive: "true",
    });
    const result = validateCategoryInput(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("dairy-products");
      expect(result.data.name).toBe("Dairy Products");
      expect(result.data.description).toBe("Fresh dairy items");
      expect(result.data.sortOrder).toBe(1);
      expect(result.data.isActive).toBe(true);
      expect(result.data.parentId).toBe(null);
    }
  });
});
