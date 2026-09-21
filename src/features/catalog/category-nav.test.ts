import { describe, expect, it, vi } from "vitest";
import { getNavCategories, mapCategoryNavRow } from "./queries";

function categoryClient(rows: unknown[]) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: rows, error: null }),
  };

  return { client: { from: vi.fn(() => builder) }, builder };
}

describe("mapCategoryNavRow", () => {
  it("maps a category row onto a nav entry", () => {
    expect(
      mapCategoryNavRow({
        id: "c1",
        slug: "tom-cua-ghe",
        name: "TÔM - CUA - GHẸ",
        icon_key: "shell",
        sort_order: 7,
      }),
    ).toEqual({
      id: "c1",
      slug: "tom-cua-ghe",
      name: "TÔM - CUA - GHẸ",
      iconKey: "shell",
      sortOrder: 7,
    });
  });

  it("keeps a missing icon null rather than inventing one", () => {
    expect(
      mapCategoryNavRow({
        id: "c2",
        slug: "so-che",
        name: "THỰC PHẨM SƠ CHẾ",
        icon_key: null,
        sort_order: 6,
      }).iconKey,
    ).toBeNull();
  });
});

describe("getNavCategories", () => {
  it("asks only for active, nav-visible categories in a deterministic order", async () => {
    const { client, builder } = categoryClient([]);

    await getNavCategories(client as never);

    expect(client.from).toHaveBeenCalledWith("categories");
    expect(builder.eq).toHaveBeenCalledWith("is_active", true);
    expect(builder.eq).toHaveBeenCalledWith("show_in_nav", true);
    expect(builder.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(builder.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("returns the mapped entries", async () => {
    const { client } = categoryClient([
      { id: "c1", slug: "cac-loai-ca", name: "CÁ", icon_key: "fish", sort_order: 1 },
    ]);

    await expect(getNavCategories(client as never)).resolves.toEqual([
      { id: "c1", slug: "cac-loai-ca", name: "CÁ", iconKey: "fish", sortOrder: 1 },
    ]);
  });
});
