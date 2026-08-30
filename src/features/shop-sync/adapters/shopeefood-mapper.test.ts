import { describe, expect, it } from "vitest";
import { mapToScrapedShop } from "./shopeefood-mapper";
import shopDetailFixture from "./fixtures/shop-detail.fixture.json";
import dishesFixture from "./fixtures/dishes.fixture.json";

describe("mapToScrapedShop", () => {
  it("maps shop info from the detail response", () => {
    const result = mapToScrapedShop(shopDetailFixture, dishesFixture);
    expect(result.shopInfo).toEqual({
      name: "Cơm Nhà Vị Quê - The Sun Avenue Novaland",
      logoUrl:
        "https://mms.img.susercontent.com/vn-11134259-81ztc-ms3oow7cw9hh99@resize_ss240x240!@crop_w240_h240_cT",
      coverImageUrl:
        "https://mms.img.susercontent.com/vn-11134259-81ztc-ms3oowod924kec@resize_ss1242x600!@crop_w1242_h600_cT",
      description: null,
      address:
        "Căn SAV.2-00.04, Tầng Trệt, Tháp 2, Tòa Nhà The Sun Avenue, 28 Mai Chí Thọ, P. An Phú, Thành Phố Thủ Đức, TP. HCM",
      openingHours: "Thứ Hai: 07:30–20:00; Chủ Nhật: 07:30–19:30",
    });
  });

  it("flattens all dishes across categories with category name attached", () => {
    const result = mapToScrapedShop(shopDetailFixture, dishesFixture);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toEqual({
      externalId: "293255211",
      name: "Cá Chẽm hấp Hồng kông - Size 1,5kg",
      description: "Hấp hồng kông bằng nước sốt hải sản dành riêng cho cá",
      priceVnd: 350000,
      imageUrl:
        "https://mms.img.susercontent.com/vn-11134505-81ztc-ms9cqqltse818c@resize_ss1242x1242!@crop_w1242_h1242_cT",
      categoryName: "Món chế biến sẳn (Hấp/Nướng)",
      isAvailable: true,
    });
  });

  it("treats an unavailable dish as isAvailable: false", () => {
    const result = mapToScrapedShop(shopDetailFixture, dishesFixture);
    expect(result.items[1].isAvailable).toBe(false);
  });

  it("maps an empty description to null and an empty photos array to a null imageUrl", () => {
    const result = mapToScrapedShop(shopDetailFixture, dishesFixture);
    const lastItem = result.items[2];
    expect(lastItem.description).toBeNull();
    expect(lastItem.imageUrl).toBeNull();
  });

  it("throws if either response did not report success", () => {
    expect(() => mapToScrapedShop({ result: "fail" }, dishesFixture)).toThrow(
      /ShopeeFood API returned a non-success result/,
    );
  });
});
