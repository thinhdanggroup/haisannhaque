export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  isAvailable: boolean;
  unitLabel: string | null;
  badgeText?: string | null;
  soldLabel?: string;
};

export type ProductVariantSummary = {
  id: string;
  sku: string;
  unit: string;
  optionSummary: string | null;
  listPrice: number;
  salePrice: number | null;
  isActive: boolean;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  origin: string | null;
  temperatureClass: string;
  images: Array<{
    url: string;
    altText: string | null;
  }>;
  variants: ProductVariantSummary[];
  relatedProducts: ProductCard[];
};
