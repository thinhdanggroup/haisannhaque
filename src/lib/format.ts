const vndFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

export function formatVnd(value: number): string {
  return `${vndFormatter.format(value)}d`;
}

export function calculateDiscountPercent(
  price: number,
  compareAtPrice: number | null,
): number | null {
  if (
    compareAtPrice === null ||
    !Number.isFinite(price) ||
    !Number.isFinite(compareAtPrice) ||
    price < 0 ||
    compareAtPrice <= 0 ||
    price >= compareAtPrice
  ) {
    return null;
  }

  const discountPercent = Math.round(
    ((compareAtPrice - price) / compareAtPrice) * 100,
  );

  return discountPercent > 0 ? discountPercent : null;
}

/**
 * Parses an admin-entered price. Prices are stored as numeric(12,2), so
 * decimals are allowed ("125500.5"), and Vietnamese notation is accepted too:
 * "125.500,5" (dot thousands, comma decimals), "1.250.000" or "125.000".
 * A single dot followed by exactly three digits is read as a thousands
 * separator: prices only keep two decimals, so "125.000" can only mean 125k.
 */
export function parsePrice(raw: string): number {
  let value = raw.trim().replace(/\s|₫|đ/gi, "");

  if (value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if ((value.match(/\./g) ?? []).length > 1 || /^\d+\.\d{3}$/.test(value)) {
    value = value.replace(/\./g, "");
  }

  if (value === "") return Number.NaN;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : Number.NaN;
}
