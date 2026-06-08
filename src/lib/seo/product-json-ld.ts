export type ProductJsonLdInput = {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: "VND";
  availability: "InStock" | "OutOfStock";
};

export type ProductJsonLd = {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  image: string;
  offers: {
    "@type": "Offer";
    price: number;
    priceCurrency: "VND";
    availability: `https://schema.org/${ProductJsonLdInput["availability"]}`;
  };
};

export function createProductJsonLd(input: ProductJsonLdInput): ProductJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.imageUrl,
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: input.currency,
      availability: `https://schema.org/${input.availability}`,
    },
  };
}
