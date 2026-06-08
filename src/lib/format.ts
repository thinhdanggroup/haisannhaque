const vndFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
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
