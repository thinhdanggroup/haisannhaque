import type { ScrapedShop, ScrapedShopInfo, ScrapedShopItem } from "./types";

type Photo = { width: number; value: string };

type DishJson = {
  id: number;
  name: string;
  description: string;
  price: { value: number };
  is_available: boolean;
  photos: Photo[];
};

type MenuCategoryJson = {
  dish_type_name: string;
  dishes: DishJson[];
};

type ShopDetailJson = {
  result: string;
  reply: {
    delivery_detail: {
      name: string;
      address: string | null;
      short_description: string | null;
      logo_mms_img_id: string | null;
      photos: Photo[];
      time?: { week_days: Array<{ week_day: number; start_time: string; end_time: string }> };
    };
  };
};

type DishesJson = {
  result: string;
  reply: { menu_infos: MenuCategoryJson[] };
};

const WEEK_DAY_NAMES = ["", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

function mmsImageUrl(mmsId: string, size = 240): string {
  return `https://mms.img.susercontent.com/${mmsId}@resize_ss${size}x${size}!@crop_w${size}_h${size}_cT`;
}

function largestPhoto(photos: Photo[] | undefined): string | null {
  if (!photos || photos.length === 0) return null;
  return photos.reduce((best, p) => (p.width > best.width ? p : best), photos[0]).value;
}

function formatOpeningHours(
  weekDays: Array<{ week_day: number; start_time: string; end_time: string }> | undefined,
): string | null {
  if (!weekDays || weekDays.length === 0) return null;
  return weekDays
    .map((d) => `${WEEK_DAY_NAMES[d.week_day] ?? d.week_day}: ${d.start_time}–${d.end_time}`)
    .join("; ");
}

function mapShopInfo(detail: ShopDetailJson["reply"]["delivery_detail"]): ScrapedShopInfo {
  return {
    name: detail.name,
    logoUrl: detail.logo_mms_img_id ? mmsImageUrl(detail.logo_mms_img_id, 240) : null,
    coverImageUrl: largestPhoto(detail.photos),
    description: detail.short_description || null,
    address: detail.address || null,
    openingHours: formatOpeningHours(detail.time?.week_days),
  };
}

function mapItem(dish: DishJson, categoryName: string): ScrapedShopItem {
  return {
    externalId: String(dish.id),
    name: dish.name,
    description: dish.description || null,
    priceVnd: dish.price?.value ?? 0,
    imageUrl: largestPhoto(dish.photos),
    categoryName,
    isAvailable: dish.is_available !== false,
  };
}

export function mapToScrapedShop(detailJson: unknown, dishesJson: unknown): ScrapedShop {
  const detail = detailJson as ShopDetailJson;
  const dishes = dishesJson as DishesJson;

  if (detail.result !== "success" || dishes.result !== "success") {
    throw new Error("ShopeeFood API returned a non-success result");
  }

  const items: ScrapedShopItem[] = [];
  for (const category of dishes.reply.menu_infos ?? []) {
    for (const dish of category.dishes ?? []) {
      items.push(mapItem(dish, category.dish_type_name));
    }
  }

  return {
    shopInfo: mapShopInfo(detail.reply.delivery_detail),
    items,
  };
}
