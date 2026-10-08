import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PHProvider } from "./posthog-provider";

// One typeface for the whole site, designed for Vietnamese, with real
// 400–800 weights (Arial only has 400/700, so 600/800 were faked by the
// browser and diacritics fell back to other fonts on phones without Arial).
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "GroceryStore",
  "@id": "https://haisannhaque.com",
  name: "Hải Sản Nhà Quê",
  url: "https://haisannhaque.com",
  logo: "https://haisannhaque.com/store-logo.png",
  description: "Nền tảng thương mại hải sản trực tuyến",
  telephone: "+84867997200",
  email: "haisannq3@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "SAV.2-00.04 Tầng trệt, Tháp 2, Toà Nhà The Sun Avenue, 28 Mai Chí Thọ, P.Bình Trưng",
    addressLocality: "Thành phố Hồ Chí Minh",
    addressCountry: "VN",
  },
  priceRange: "$$",
};

export const preferredRegion = "sin1";

export const metadata: Metadata = {
  metadataBase: new URL("https://haisannhaque.com"),
  title: {
    default: "Hải Sản Nhà Quê",
    template: "%s | Hải Sản Nhà Quê",
  },
  description: "Nền tảng thương mại hải sản trực tuyến",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  );
}



