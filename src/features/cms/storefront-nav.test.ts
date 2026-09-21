import { describe, expect, it } from "vitest";
import { toStorefrontNavLink } from "./queries";

describe("toStorefrontNavLink", () => {
  it("builds the category href from the slug, so a menu link can never point at a slug that does not exist", () => {
    expect(
      toStorefrontNavLink({
        id: "c1",
        slug: "dac-san-dong-que",
        name: "ĐẶC SẢN ĐỒNG QUÊ",
        iconKey: "waves",
        sortOrder: 5,
      }),
    ).toEqual({
      id: "c1",
      label: "ĐẶC SẢN ĐỒNG QUÊ",
      href: "/categories/dac-san-dong-que",
      iconKey: "waves",
    });
  });
});
