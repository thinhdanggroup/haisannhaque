export type ScrapedShopItem = {
  externalId: string;
  name: string;
  description: string | null;
  priceVnd: number;
  imageUrl: string | null;
  categoryName: string | null;
  isAvailable: boolean;
};

export type ScrapedShopInfo = {
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  address: string | null;
  openingHours: string | null;
};

export type ScrapedShop = {
  shopInfo: ScrapedShopInfo;
  items: ScrapedShopItem[];
};

export interface ShopSourceAdapter {
  fetchShop(sourceUrl: string): Promise<ScrapedShop>;
}
