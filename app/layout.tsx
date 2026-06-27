import type { Metadata } from "next";
import { Geist, Geist_Mono, Dancing_Script } from "next/font/google";
import "./globals.css";
import { PHProvider } from "./posthog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin", "latin-ext"],
  weight: ["700"],
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
  email: "care@haisannhaque.vn",
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "SAV.2-00.04 Tầng trệt, Tháp 2, Toà Nhà The Sun Avenue, 28 Mai Chí Thọ",
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
      className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  );
}



