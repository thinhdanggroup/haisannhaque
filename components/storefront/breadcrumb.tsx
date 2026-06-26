import Link from "next/link";

const SITE_URL = "https://haisannhaque.com";

export type BreadcrumbItem = {
  label: string;
  href: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-1">
                {i > 0 && (
                  <span aria-hidden="true" className="text-slate-300">
                    /
                  </span>
                )}
                {isLast ? (
                  <span className="font-medium text-slate-950">{item.label}</span>
                ) : (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-teal-700"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
