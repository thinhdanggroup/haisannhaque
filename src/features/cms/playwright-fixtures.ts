import type { CmsProductCard, HomePageContent, StorefrontChrome } from "./types";

function fixtureProduct({
  slug,
  name,
  imageText,
  price,
  compareAtPrice = null,
  badgeText = null,
  unitLabel,
  soldLabel,
}: {
  slug: string;
  name: string;
  imageText: string;
  price: number;
  compareAtPrice?: number | null;
  badgeText?: string | null;
  unitLabel: string;
  soldLabel: string;
}): CmsProductCard {
  return {
    id: `e2e-${slug}`,
    slug,
    name,
    imageUrl: `https://placehold.co/900x700/e0f7fa/0f172a?text=${encodeURIComponent(
      imageText,
    )}`,
    price,
    compareAtPrice,
    isAvailable: true,
    badgeText,
    unitLabel,
    soldLabel,
    defaultVariantId: null,
  };
}

const fixtureProducts = {
  alaskaLobster: fixtureProduct({
    slug: "alaska-lobster-500g",
    name: "Tôm hùm Alaska 500g",
    imageText: "Tom Hum Alaska",
    price: 499000,
    compareAtPrice: 745000,
    badgeText: "Hot",
    unitLabel: "1 con",
    soldLabel: "Đã bán 120",
  }),
  koreanAbalone: fixtureProduct({
    slug: "korean-abalone-live",
    name: "Bào ngư Hàn Quốc sống",
    imageText: "Bao Ngu",
    price: 65000,
    compareAtPrice: 99000,
    badgeText: "Sống",
    unitLabel: "1 con",
    soldLabel: "Đã bán 86",
  }),
  freshSalmon: fixtureProduct({
    slug: "fresh-salmon-loin",
    name: "Phi lê cá hồi tươi",
    imageText: "Ca Hoi Tuoi",
    price: 249000,
    badgeText: "Tươi",
    unitLabel: "khay 200g",
    soldLabel: "Đã bán 64",
  }),
  blackTigerShrimp: fixtureProduct({
    slug: "black-tiger-shrimp",
    name: "Tôm sú tươi",
    imageText: "Tom Su Tuoi",
    price: 229000,
    compareAtPrice: 260000,
    badgeText: "Tươi",
    unitLabel: "kg",
    soldLabel: "Đã bán 91",
  }),
  greenLobster: fixtureProduct({
    slug: "green-lobster-live",
    name: "Tôm hùm xanh sống",
    imageText: "Tom Hum Xanh",
    price: 429000,
    compareAtPrice: 535000,
    badgeText: "Flash",
    unitLabel: "con 350g",
    soldLabel: "Đã bán 42",
  }),
  peeledShrimp: fixtureProduct({
    slug: "peeled-white-shrimp",
    name: "Tôm thẻ bóc nõn",
    imageText: "Tom Boc Non",
    price: 69000,
    compareAtPrice: 79000,
    badgeText: "Giảm",
    unitLabel: "khay 150g",
    soldLabel: "Đã bán 75",
  }),
  hotpotCombo: fixtureProduct({
    slug: "seafood-hotpot-combo",
    name: "Combo lẩu hải sản",
    imageText: "Lau Hai San",
    price: 399000,
    compareAtPrice: 459000,
    badgeText: "Combo",
    unitLabel: "combo",
    soldLabel: "Đã bán 58",
  }),
  lobsterTail: fixtureProduct({
    slug: "lobster-tail-pack",
    name: "Đuôi tôm hùm",
    imageText: "Duoi Tom Hum",
    price: 489000,
    compareAtPrice: 530000,
    badgeText: "Giảm",
    unitLabel: "gói",
    soldLabel: "Đã bán 36",
  }),
  sashimiMix: fixtureProduct({
    slug: "sashimi-mix-family",
    name: "Set sashimi gia đình",
    imageText: "Sashimi Gia Dinh",
    price: 799000,
    compareAtPrice: 965000,
    badgeText: "Tươi",
    unitLabel: "combo",
    soldLabel: "Đã bán 31",
  }),
  shrimpMaki: fixtureProduct({
    slug: "shrimp-teriyaki-maki",
    name: "Maki tôm teriyaki",
    imageText: "Maki Tom",
    price: 99000,
    badgeText: "Sẵn ăn",
    unitLabel: "phần",
    soldLabel: "Đã bán 69",
  }),
  salmonSaku: fixtureProduct({
    slug: "norway-salmon-saku",
    name: "Cá hồi Na Uy saku",
    imageText: "Ca Hoi Saku",
    price: 320000,
    badgeText: "Lạnh",
    unitLabel: "khay 250g",
    soldLabel: "Đã bán 44",
  }),
  ikuraSushi: fixtureProduct({
    slug: "ikura-sushi-pack",
    name: "Set sushi trứng cá hồi",
    imageText: "Trung Ca Hoi",
    price: 219000,
    badgeText: "Mới",
    unitLabel: "gói",
    soldLabel: "Đã bán 28",
  }),
  tigerPrawn: fixtureProduct({
    slug: "tiger-prawn-live",
    name: "Tôm sú sống",
    imageText: "Tom Su Song",
    price: 420000,
    badgeText: "Sống",
    unitLabel: "kg",
    soldLabel: "Đã bán 53",
  }),
  blueCrab: fixtureProduct({
    slug: "blue-crab-live",
    name: "Cua xanh sống",
    imageText: "Cua Xanh",
    price: 369000,
    compareAtPrice: 390000,
    badgeText: "Sống",
    unitLabel: "1kg",
    soldLabel: "Đã bán 49",
  }),
  clamCombo: fixtureProduct({
    slug: "clam-combo",
    name: "Combo 3 loại nghêu",
    imageText: "Combo Ngheu",
    price: 119000,
    badgeText: "Tươi",
    unitLabel: "combo",
    soldLabel: "Đã bán 57",
  }),
  canadaOyster: fixtureProduct({
    slug: "canada-oyster-half-shell",
    name: "Hàu Canada nửa vỏ",
    imageText: "Hau Canada",
    price: 290000,
    badgeText: "Lạnh",
    unitLabel: "hộp",
    soldLabel: "Đã bán 33",
  }),
  scallopMeat: fixtureProduct({
    slug: "japanese-scallop-meat",
    name: "Cồi sò điệp Nhật",
    imageText: "So Diep",
    price: 349000,
    compareAtPrice: 389000,
    badgeText: "Nhập",
    unitLabel: "khay 250g",
    soldLabel: "Đã bán 46",
  }),
  squidRing: fixtureProduct({
    slug: "squid-ring-tray",
    name: "Khoanh mực đông lạnh",
    imageText: "Khoanh Muc",
    price: 99000,
    compareAtPrice: 125000,
    badgeText: "Giảm",
    unitLabel: "khay 300g",
    soldLabel: "Đã bán 82",
  }),
  babyOctopus: fixtureProduct({
    slug: "baby-octopus-tray",
    name: "Bạch tuộc baby khay",
    imageText: "Bach Tuoc",
    price: 145000,
    badgeText: "Đông lạnh",
    unitLabel: "khay 300g",
    soldLabel: "Đã bán 52",
  }),
  clamMeat: fixtureProduct({
    slug: "clam-meat-pack",
    name: "Thịt nghêu gói",
    imageText: "Thit Ngheu",
    price: 69000,
    badgeText: "Đông lạnh",
    unitLabel: "gói 250g",
    soldLabel: "Đã bán 67",
  }),
  salmonBowl: fixtureProduct({
    slug: "ready-meal-salmon-soy",
    name: "Cơm cá hồi sốt tương",
    imageText: "Com Ca Hoi",
    price: 179000,
    badgeText: "Sẵn ăn",
    unitLabel: "khay",
    soldLabel: "Đã bán 74",
  }),
  salmonTeriyaki: fixtureProduct({
    slug: "grilled-salmon-teriyaki",
    name: "Cá hồi nướng teriyaki",
    imageText: "Ca Hoi Teriyaki",
    price: 189000,
    badgeText: "Sẵn ăn",
    unitLabel: "khay",
    soldLabel: "Đã bán 39",
  }),
  seaweedSalad: fixtureProduct({
    slug: "seaweed-salad-box",
    name: "Salad rong biển",
    imageText: "Salad Rong Bien",
    price: 59000,
    badgeText: "Lạnh",
    unitLabel: "hộp",
    soldLabel: "Đã bán 93",
  }),
  snowCrab: fixtureProduct({
    slug: "snow-crab-cluster",
    name: "Cụm cua tuyết",
    imageText: "Cua Tuyet",
    price: 629000,
    compareAtPrice: 690000,
    badgeText: "Đông lạnh",
    unitLabel: "kg",
    soldLabel: "Đã bán 27",
  }),
};

function fixtureRail({
  id,
  key,
  title,
  subtitle,
  sortOrder,
  viewMoreHref,
  products,
  type = "product_rail",
  metadata = {},
}: {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  sortOrder: number;
  viewMoreHref: string;
  products: HomePageContent["sections"][number]["products"];
  type?: "product_rail" | "flash_sale";
  metadata?: Record<string, unknown>;
}): HomePageContent["sections"][number] {
  return {
    id,
    key,
    type,
    title,
    subtitle,
    layout: "dense_grid",
    sortOrder,
    metadata: { viewMoreHref, ...metadata },
    banners: [],
    products,
  };
}

const categoryNavItems = [
  ["Bán chạy", "/categories/best-sellers", "star"],
  ["Khuyến mãi", "/categories/promotions", "badge-percent"],
  ["Sushi & sashimi", "/categories/sashimi", "fish"],
  ["Hải sản tươi", "/categories/fresh-seafood", "waves"],
  ["Hải sản đông lạnh", "/categories/frozen-seafood", "snowflake"],
  ["Hải sản sống", "/categories/live-seafood", "waves"],
  ["Hàng nhập khẩu", "/categories/imported-seafood", "ship"],
  ["Cá hồi", "/categories/salmon", "fish"],
  ["Hàu và nghêu sò", "/categories/oyster-shellfish", "shell"],
  ["Cua và tôm hùm", "/categories/crab-lobster", "fish"],
  ["Tôm và mực", "/categories/shrimp-squid", "fish"],
  ["Món chế biến sẵn", "/categories/ready-to-eat", "utensils"],
] as const;

function fixtureBrandAsset({
  assetKey,
  placement,
  imageText,
  altText,
  href = null,
  sortOrder,
  color = "f8fafc",
}: {
  assetKey: string;
  placement: StorefrontChrome["paymentAssets"][number]["placement"];
  imageText: string;
  altText: string;
  href?: string | null;
  sortOrder: number;
  color?: string;
}): StorefrontChrome["paymentAssets"][number] {
  return {
    id: `e2e-${assetKey}`,
    assetKey,
    placement,
    imageUrl: `https://placehold.co/220x90/${color}/0f172a?text=${encodeURIComponent(
      imageText,
    )}`,
    altText,
    href,
    sortOrder,
  };
}

export const playwrightChromeFixture: StorefrontChrome = {
  headerNav: categoryNavItems.map(([label, href, iconKey], index) => ({
    id: `e2e-header-${index}`,
    placement: "header",
    label,
    href,
    iconKey,
    sortOrder: (index + 1) * 10,
  })),
  sidebarNav: categoryNavItems.map(([label, href, iconKey], index) => ({
    id: `e2e-sidebar-${index}`,
    placement: "sidebar",
    label,
    href,
    iconKey,
    sortOrder: (index + 1) * 10,
  })),
  mobileDock: [
    {
      id: "e2e-dock-category",
      placement: "mobile_dock",
      label: "Danh mục",
      href: "/search",
      iconKey: "menu",
      sortOrder: 10,
    },
    {
      id: "e2e-dock-hours",
      placement: "mobile_dock",
      label: "8h - 21h",
      href: "tel:19000098",
      iconKey: "phone",
      sortOrder: 20,
    },
    {
      id: "e2e-dock-messenger",
      placement: "mobile_dock",
      label: "Messenger",
      href: "#messenger",
      iconKey: "message-circle",
      sortOrder: 30,
    },
    {
      id: "e2e-dock-zalo",
      placement: "mobile_dock",
      label: "Zalo",
      href: "#zalo",
      iconKey: "send",
      sortOrder: 40,
    },
    {
      id: "e2e-dock-account",
      placement: "mobile_dock",
      label: "Tài khoản",
      href: "/account/orders",
      iconKey: "user",
      sortOrder: 50,
    },
  ],
  footerLinks: [
    {
      id: "e2e-company-about",
      groupLabel: "Thông tin",
      label: "Về Hải Sản Nhà Quê",
      href: "#company",
      sortOrder: 10,
    },
    {
      id: "e2e-company-stores",
      groupLabel: "Thông tin",
      label: "Hệ thống cửa hàng",
      href: "#stores",
      sortOrder: 20,
    },
    {
      id: "e2e-company-loyalty",
      groupLabel: "Thông tin",
      label: "Khách hàng thân thiết",
      href: "/account/loyalty",
      sortOrder: 30,
    },
    {
      id: "e2e-support-shipping",
      groupLabel: "Hỗ trợ khách hàng",
      label: "Chính sách giao hàng",
      href: "#shipping",
      sortOrder: 10,
    },
    {
      id: "e2e-support-ordering",
      groupLabel: "Hỗ trợ khách hàng",
      label: "Hướng dẫn đặt hàng",
      href: "#ordering",
      sortOrder: 20,
    },
    {
      id: "e2e-support-returns",
      groupLabel: "Hỗ trợ khách hàng",
      label: "Đổi trả và khiếu nại",
      href: "#returns",
      sortOrder: 30,
    },
    {
      id: "e2e-featured-sashimi",
      groupLabel: "Danh mục nổi bật",
      label: "Sushi & sashimi",
      href: "/categories/sashimi",
      sortOrder: 10,
    },
    {
      id: "e2e-featured-shellfish",
      groupLabel: "Danh mục nổi bật",
      label: "Hàu, nghêu và sò",
      href: "/categories/oyster-shellfish",
      sortOrder: 20,
    },
    {
      id: "e2e-featured-ready",
      groupLabel: "Danh mục nổi bật",
      label: "Món chế biến sẵn",
      href: "/categories/ready-to-eat",
      sortOrder: 30,
    },
  ],
  paymentAssets: [
    fixtureBrandAsset({
      assetKey: "payment-cod",
      placement: "payment",
      imageText: "COD",
      altText: "Thanh toán khi nhận hàng",
      sortOrder: 10,
      color: "ecfeff",
    }),
    fixtureBrandAsset({
      assetKey: "payment-momo",
      placement: "payment",
      imageText: "MoMo Demo",
      altText: "Ví điện tử MoMo demo",
      sortOrder: 20,
      color: "fce7f3",
    }),
    fixtureBrandAsset({
      assetKey: "payment-vnpay",
      placement: "payment",
      imageText: "VNPAY Demo",
      altText: "Cổng thanh toán VNPAY demo",
      sortOrder: 30,
      color: "dbeafe",
    }),
    fixtureBrandAsset({
      assetKey: "payment-bank",
      placement: "payment",
      imageText: "Bank Transfer",
      altText: "Chuyển khoản ngân hàng",
      sortOrder: 40,
      color: "fef3c7",
    }),
  ],
  partnerAssets: [
    fixtureBrandAsset({
      assetKey: "partner-retail",
      placement: "partner",
      imageText: "Retail Partner",
      altText: "Đối tác bán lẻ demo",
      sortOrder: 10,
      color: "e0f2fe",
    }),
    fixtureBrandAsset({
      assetKey: "partner-delivery",
      placement: "partner",
      imageText: "Cold Delivery",
      altText: "Đối tác giao hàng lạnh demo",
      sortOrder: 20,
      color: "dcfce7",
    }),
    fixtureBrandAsset({
      assetKey: "partner-kitchen",
      placement: "partner",
      imageText: "Prep Kitchen",
      altText: "Đối tác bếp sơ chế demo",
      sortOrder: 30,
      color: "ffedd5",
    }),
  ],
  trustAssets: [
    fixtureBrandAsset({
      assetKey: "trust-fresh",
      placement: "trust",
      imageText: "Fresh Daily",
      altText: "Cam kết hàng mới mỗi ngày",
      sortOrder: 10,
      color: "ccfbf1",
    }),
    fixtureBrandAsset({
      assetKey: "trust-cold-chain",
      placement: "trust",
      imageText: "Cold Chain",
      altText: "Cam kết giữ lạnh",
      sortOrder: 20,
      color: "e0f2fe",
    }),
    fixtureBrandAsset({
      assetKey: "trust-traceable",
      placement: "trust",
      imageText: "Traceable",
      altText: "Thông tin nguồn hàng minh bạch",
      sortOrder: 30,
      color: "fef9c3",
    }),
  ],
};

export const playwrightHomeFixture: HomePageContent = {
  sections: [
    {
      id: "e2e-hero",
      key: "hero",
      type: "hero",
      title: "Chợ hải sản hôm nay",
      subtitle: "Ưu đãi hải sản tươi từ Hải Sản Nhà Quê",
      layout: "dao_market_grid",
      sortOrder: 10,
      metadata: {},
      banners: [
        {
          id: "e2e-hero-primary",
          title: "Ưu đãi hải sản trong tuần",
          subtitle: "Ảnh placeholder gốc cho mùa hải sản.",
          imageUrl:
            "https://placehold.co/1200x430/0284c7/ffffff?text=Cho+Hai+San",
          mobileImageUrl:
            "https://placehold.co/720x360/0284c7/ffffff?text=Cho+Hai+San",
          ctaLabel: "Mua ngay",
          ctaHref: "/search?q=seafood",
          sortOrder: 10,
        },
        {
          id: "e2e-hero-value",
          title: "Hải sản từ 29K",
          subtitle: "Khẩu phần mỗi ngày cho bữa cơm nhà.",
          imageUrl: "https://placehold.co/600x210/f97316/ffffff?text=Hai+San+29K",
          mobileImageUrl:
            "https://placehold.co/720x320/f97316/ffffff?text=Hai+San+29K",
          ctaLabel: "Xem ưu đãi",
          ctaHref: "/categories/promotions",
          sortOrder: 20,
        },
        {
          id: "e2e-hero-sashimi",
          title: "Sushi & sashimi",
          subtitle: "Chuẩn bị mới mỗi ngày với ảnh placeholder.",
          imageUrl: "https://placehold.co/600x210/16a34a/ffffff?text=Sashimi",
          mobileImageUrl:
            "https://placehold.co/720x320/16a34a/ffffff?text=Sashimi",
          ctaLabel: "Xem sashimi",
          ctaHref: "/categories/sashimi",
          sortOrder: 30,
        },
        {
          id: "e2e-hero-shellfish",
          title: "Hàu, nghêu và sò",
          subtitle: "Gợi ý món vỏ cho bữa cuối tuần.",
          imageUrl:
            "https://placehold.co/600x210/fef3c7/0f172a?text=Hau+Ngheu+So",
          mobileImageUrl:
            "https://placehold.co/720x320/fef3c7/0f172a?text=Hai+San+Vo",
          ctaLabel: "Xem món vỏ",
          ctaHref: "/categories/oyster-shellfish",
          sortOrder: 40,
        },
      ],
      products: [],
    },
    {
      id: "e2e-service-strip",
      key: "service-strip",
      type: "service_strip",
      title: "Cam kết dịch vụ",
      subtitle: "Giao hàng, tích điểm và hỗ trợ",
      layout: "icons",
      sortOrder: 20,
      metadata: {
        items: [
          {
            label: "Giao 2H",
            detail: "Giao nhanh giữ lạnh nội thành",
            iconKey: "truck",
          },
          {
            label: "Tích điểm",
            detail: "Nhận điểm cho mỗi đơn hàng",
            iconKey: "award",
          },
          {
            label: "Hàng mới",
            detail: "Hải sản mới về cho bữa cơm tuần",
            iconKey: "package-plus",
          },
          {
            label: "Bán chạy",
            detail: "Món được chọn nhiều đã bổ sung hàng",
            iconKey: "star",
          },
        ],
      },
      banners: [],
      products: [],
    },
    {
      id: "e2e-category-shortcuts",
      key: "category-shortcuts",
      type: "category_shortcuts",
      title: "Mua theo danh mục",
      subtitle: "Lối tắt mua nhanh",
      layout: "compact_grid",
      sortOrder: 30,
      metadata: {
        items: categoryNavItems.map(([label, href, iconKey]) => ({
          label,
          href,
          iconKey,
        })),
      },
      banners: [],
      products: [],
    },
    fixtureRail({
      id: "e2e-best-sellers",
      key: "best-sellers",
      title: "Bán chạy",
      subtitle: "Sản phẩm được chọn nhiều tuần này",
      sortOrder: 40,
      viewMoreHref: "/categories/best-sellers",
      products: [
        fixtureProducts.alaskaLobster,
        fixtureProducts.koreanAbalone,
        fixtureProducts.freshSalmon,
        fixtureProducts.blackTigerShrimp,
      ],
    }),
    fixtureRail({
      id: "e2e-flash-sale",
      key: "flash-sale",
      type: "flash_sale",
      title: "Flash sale hải sản",
      subtitle: "Ưu đãi trong ngày",
      sortOrder: 50,
      viewMoreHref: "/categories/promotions",
      metadata: {
        saleBadge: "Đang giảm",
        countdownLabel: "Kết thúc sau",
        countdownItems: [
          { value: "02", label: "Giờ" },
          { value: "18", label: "Phút" },
          { value: "45", label: "Giây" },
        ],
      },
      products: [
        fixtureProducts.greenLobster,
        fixtureProducts.peeledShrimp,
        fixtureProducts.hotpotCombo,
        fixtureProducts.lobsterTail,
      ],
    }),
    {
      id: "e2e-budget-promo",
      key: "budget-promo",
      type: "promo_band",
      title: "Hải sản giá tốt từ 29K",
      subtitle: "Món hải sản hằng ngày cho bữa cơm nhà",
      layout: "wide_banner",
      sortOrder: 60,
      metadata: {},
      banners: [
        {
          id: "e2e-budget-banner",
          title: "Hải sản từ 29K",
          subtitle: "Khẩu phần thực tế cho bữa cơm gia đình.",
          imageUrl:
            "https://placehold.co/1400x260/0ea5e9/ffffff?text=Hai+San+Gia+Tot",
          mobileImageUrl:
            "https://placehold.co/720x320/0ea5e9/ffffff?text=Gia+Tot",
          ctaLabel: "Mua giá tốt",
          ctaHref: "/categories/promotions",
          sortOrder: 10,
        },
      ],
      products: [],
    },
    {
      id: "e2e-recommendations",
      key: "recommendations",
      type: "recommendation_tabs",
      title: "Gợi ý cho bạn",
      subtitle: "Bộ sưu tập hải sản được tuyển chọn",
      layout: "tabs",
      sortOrder: 70,
      metadata: {
        viewMoreHref: "/search?collection=recommendations",
        tabs: [
          { key: "family", label: "Bữa cơm gia đình" },
          { key: "party", label: "Cuối tuần đãi khách" },
          { key: "quick", label: "Món nhanh trong ngày" },
          { key: "premium", label: "Hải sản cao cấp" },
        ],
      },
      banners: [],
      products: [
        fixtureProducts.freshSalmon,
        fixtureProducts.hotpotCombo,
        fixtureProducts.canadaOyster,
        fixtureProducts.sashimiMix,
        fixtureProducts.greenLobster,
        fixtureProducts.scallopMeat,
        fixtureProducts.salmonBowl,
        fixtureProducts.blueCrab,
      ],
    },
    fixtureRail({
      id: "e2e-sashimi",
      key: "sashimi",
      title: "Sushi & sashimi",
      subtitle: "Món lạnh sẵn dùng",
      sortOrder: 80,
      viewMoreHref: "/categories/sashimi",
      products: [
        fixtureProducts.sashimiMix,
        fixtureProducts.shrimpMaki,
        fixtureProducts.salmonSaku,
        fixtureProducts.ikuraSushi,
      ],
    }),
    fixtureRail({
      id: "e2e-frozen-seafood",
      key: "frozen-seafood",
      title: "Hải sản đông lạnh",
      subtitle: "Khẩu phần tiện trữ đông",
      sortOrder: 90,
      viewMoreHref: "/categories/frozen-seafood",
      products: [
        fixtureProducts.peeledShrimp,
        fixtureProducts.scallopMeat,
        fixtureProducts.squidRing,
        fixtureProducts.babyOctopus,
      ],
    }),
    fixtureRail({
      id: "e2e-shellfish",
      key: "shellfish",
      title: "Hàu, nghêu và sò",
      subtitle: "Món vỏ giữ lạnh, dễ chế biến",
      sortOrder: 100,
      viewMoreHref: "/categories/oyster-shellfish",
      products: [
        fixtureProducts.canadaOyster,
        fixtureProducts.clamCombo,
        fixtureProducts.scallopMeat,
        fixtureProducts.clamMeat,
      ],
    }),
    fixtureRail({
      id: "e2e-crab-lobster",
      key: "crab-lobster",
      title: "Cua và tôm hùm",
      subtitle: "Gợi ý cho bữa ăn đặc biệt",
      sortOrder: 110,
      viewMoreHref: "/categories/crab-lobster",
      products: [
        fixtureProducts.blueCrab,
        fixtureProducts.alaskaLobster,
        fixtureProducts.lobsterTail,
        fixtureProducts.snowCrab,
      ],
    }),
    fixtureRail({
      id: "e2e-ready-to-eat",
      key: "ready-to-eat",
      title: "Món chế biến sẵn",
      subtitle: "Món hải sản đã chuẩn bị",
      sortOrder: 120,
      viewMoreHref: "/categories/ready-to-eat",
      products: [
        fixtureProducts.salmonBowl,
        fixtureProducts.salmonTeriyaki,
        fixtureProducts.seaweedSalad,
        fixtureProducts.snowCrab,
      ],
    }),
    {
      id: "e2e-content-highlights",
      key: "content-highlights",
      type: "content_highlights",
      title: "Thông tin hữu ích",
      subtitle: "Mẹo chọn, bảo quản và đặt hải sản",
      layout: "editorial_grid",
      sortOrder: 130,
      metadata: {
        cards: [
          {
            groupLabel: "Cẩm nang",
            title: "Cách giữ lạnh hải sản khi nhận hàng",
            description:
              "Gợi ý kiểm tra đá gel, bao bì và thời gian bảo quản trước khi nấu.",
            href: "#cold-storage",
            imageUrl:
              "https://placehold.co/720x420/e0f2fe/0f172a?text=Giu+Lanh+Hai+San",
          },
          {
            groupLabel: "Món ngon",
            title: "Thực đơn cuối tuần với tôm và nghêu",
            description:
              "Một nhịp chuẩn bị nhanh cho bữa cơm gia đình nhiều món.",
            href: "#weekend-menu",
            imageUrl:
              "https://placehold.co/540x360/fef3c7/0f172a?text=Thuc+Don+Cuoi+Tuan",
          },
          {
            groupLabel: "Chính sách",
            title: "Cam kết đổi trả cho đơn giao lạnh",
            description:
              "Quy trình tiếp nhận phản hồi minh bạch cho đơn hàng trong ngày.",
            href: "#fresh-policy",
            imageUrl:
              "https://placehold.co/540x360/dcfce7/0f172a?text=Cam+Ket+Don+Hang",
          },
        ],
        highlights: [
          {
            groupLabel: "Cẩm nang",
            title: "Cách giữ lạnh hải sản khi nhận hàng",
            description:
              "Gợi ý kiểm tra đá gel, bao bì và thời gian bảo quản trước khi nấu.",
            href: "#cold-storage",
            imageUrl:
              "https://placehold.co/720x420/e0f2fe/0f172a?text=Giu+Lanh+Hai+San",
          },
          {
            groupLabel: "Món ngon",
            title: "Thực đơn cuối tuần với tôm và nghêu",
            description:
              "Một nhịp chuẩn bị nhanh cho bữa cơm gia đình nhiều món.",
            href: "#weekend-menu",
            imageUrl:
              "https://placehold.co/540x360/fef3c7/0f172a?text=Thuc+Don+Cuoi+Tuan",
          },
          {
            groupLabel: "Chính sách",
            title: "Cam kết đổi trả cho đơn giao lạnh",
            description:
              "Quy trình tiếp nhận phản hồi minh bạch cho đơn hàng trong ngày.",
            href: "#fresh-policy",
            imageUrl:
              "https://placehold.co/540x360/dcfce7/0f172a?text=Cam+Ket+Don+Hang",
          },
        ],
      },
      banners: [],
      products: [],
    },
    {
      id: "e2e-partners",
      key: "partners",
      type: "partner_strip",
      title: "Đối tác Hải Sản Nhà Quê",
      subtitle: "Đối tác bán lẻ, thanh toán và vận hành demo",
      layout: "logo_grid",
      sortOrder: 140,
      metadata: {
        groups: [
          {
            label: "Đối tác",
            items: [
              {
                label: "Retail Partner",
                imageUrl:
                  "https://placehold.co/220x90/e0f2fe/0f172a?text=Retail+Partner",
                href: "#partners",
              },
              {
                label: "Cold Delivery",
                imageUrl:
                  "https://placehold.co/220x90/dcfce7/0f172a?text=Cold+Delivery",
                href: "#partners",
              },
            ],
          },
          {
            label: "Thanh toán",
            items: [
              {
                label: "COD",
                imageUrl: "https://placehold.co/220x90/ecfeff/0f172a?text=COD",
                href: "#payments",
              },
              {
                label: "VNPAY Demo",
                imageUrl:
                  "https://placehold.co/220x90/dbeafe/0f172a?text=VNPAY+Demo",
                href: "#payments",
              },
            ],
          },
          {
            label: "Kênh xã hội",
            items: [
              {
                label: "Zalo demo",
                imageUrl:
                  "https://placehold.co/220x90/e0f7fa/0f172a?text=Zalo+Demo",
                href: "#zalo",
              },
              {
                label: "Community demo",
                imageUrl:
                  "https://placehold.co/220x90/fce7f3/0f172a?text=Community",
                href: "#community",
              },
            ],
          },
          {
            label: "Cam kết",
            items: [
              {
                label: "Fresh Daily",
                imageUrl:
                  "https://placehold.co/220x90/ccfbf1/0f172a?text=Fresh+Daily",
                href: "#trust",
              },
              {
                label: "Cold Chain",
                imageUrl:
                  "https://placehold.co/220x90/e0f2fe/0f172a?text=Cold+Chain",
                href: "#trust",
              },
            ],
          },
        ],
      },
      banners: [
        {
          id: "e2e-partner-retail",
          title: "Retail Partner",
          subtitle: "Logo placeholder đối tác bán lẻ",
          imageUrl:
            "https://placehold.co/220x90/e0f2fe/0f172a?text=Retail+Partner",
          mobileImageUrl: null,
          ctaLabel: null,
          ctaHref: "#partners",
          sortOrder: 10,
        },
        {
          id: "e2e-partner-payment",
          title: "VNPAY Demo",
          subtitle: "Logo placeholder thanh toán",
          imageUrl:
            "https://placehold.co/220x90/dbeafe/0f172a?text=VNPAY+Demo",
          mobileImageUrl: null,
          ctaLabel: null,
          ctaHref: "#payments",
          sortOrder: 20,
        },
        {
          id: "e2e-partner-social",
          title: "Zalo demo",
          subtitle: "Logo placeholder kênh xã hội",
          imageUrl: "https://placehold.co/220x90/e0f7fa/0f172a?text=Zalo+Demo",
          mobileImageUrl: null,
          ctaLabel: null,
          ctaHref: "#zalo",
          sortOrder: 30,
        },
        {
          id: "e2e-partner-trust",
          title: "Fresh Daily",
          subtitle: "Logo placeholder cam kết chất lượng",
          imageUrl:
            "https://placehold.co/220x90/ccfbf1/0f172a?text=Fresh+Daily",
          mobileImageUrl: null,
          ctaLabel: null,
          ctaHref: "#trust",
          sortOrder: 40,
        },
      ],
      products: [],
    },
  ],
};

export function shouldUseStorefrontPlaywrightFixture(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://example.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "test-anon-key"
  );
}
