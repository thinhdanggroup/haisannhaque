type ProductPreviewLinkProps = {
  slug: string;
  status: string;
  className?: string;
};

/**
 * The storefront detail page only serves published products, so a draft or
 * archived product would open a 404 — the link is disabled for those instead.
 */
export function ProductPreviewLink({ slug, status, className = "" }: ProductPreviewLinkProps) {
  if (status !== "published") {
    return (
      <span
        aria-disabled="true"
        title="Chỉ xem trước được sản phẩm đã xuất bản"
        className={`cursor-not-allowed opacity-50 ${className}`}
      >
        Xem trước
      </span>
    );
  }

  return (
    <a
      href={`/products/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Mở trang sản phẩm trong tab mới"
      className={className}
    >
      Xem trước
    </a>
  );
}
