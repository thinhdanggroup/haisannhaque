# Daohaisan Homepage Density Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. When spawning subagents, always request model `gpt-5.5` with reasoning effort `xhigh`.

**Goal:** Rework the public homepage so it reads like a dense daohaisan.vn-inspired seafood commerce homepage while keeping Dao Seafood branding, original placeholder seafood assets, and Supabase-backed CMS data.

**Architecture:** Keep the existing CMS schema and server-rendered App Router data flow. Expand seeded CMS/product/navigation data, make the Playwright fixture match the real seeded merchandising shape, and adjust storefront components to render compact banners, category shortcuts, and dense product rails from CMS sections.

**Tech Stack:** Next.js 16.2.7 App Router, React 19, TypeScript strict mode, Tailwind CSS 4, Supabase/PostgreSQL/RLS, Vitest, Playwright, lucide-react.

---

## Source Documents

- Project guide: `AGENTS.md`
- Daohaisan research: `docs/dao-hai-san.md`
- Current requirements: `docs/dao-hai-san-requirements.md`
- Existing frontend plan: `docs/superpowers/plans/2026-06-07-daohaisan-inspired-frontend-ui.md`
- App Router docs: `node_modules/next/dist/docs/01-app/index.md`

## Implementation Constraints

- Do not create a git worktree. Implement directly in `/Users/thinh.dang2/Documents/codes/web-store`.
- Do not copy daohaisan.vn images, logos, product copy, or proprietary brand assets.
- Keep the current CMS schema. This pass should not add a new migration unless implementation discovers a real blocker.
- Keep real homepage content Supabase-backed through `getHomePageContent` and `getStorefrontChrome`.
- Keep deterministic Playwright content in fixtures only for the test Supabase environment.
- Do not stage or commit `AGENTS.md` unless the user explicitly asks.
- If implementation changes `next-env.d.ts` because a dev server generated `.next/dev/types/routes.d.ts`, restore it before committing.

## File Structure

Modify these files:

```text
app/(storefront)/page.tsx
components/storefront/category-sidebar.tsx
components/storefront/hero-merchandising-grid.tsx
components/storefront/product-card.tsx
components/storefront/product-grid.tsx
components/storefront/product-rail.tsx
components/storefront/storefront-header.tsx
src/features/cms/playwright-fixtures.ts
supabase/seed.sql
tests/e2e/storefront-checkout.spec.ts
```

Create this file:

```text
components/storefront/category-shortcut-strip.tsx
```

Do not modify these files unless a test reveals they are required:

```text
supabase/migrations/202606070010_cms_merchandising.sql
src/features/cms/queries.ts
src/features/cms/types.ts
```

---

### Task 1: Add Homepage Density Acceptance Coverage

**Files:**
- Modify: `tests/e2e/storefront-checkout.spec.ts`

- [ ] **Step 1: Update the homepage smoke expectations before UI changes**

Replace the two homepage checks inside `storefront homepage renders at ...` with density-oriented assertions:

```ts
await expect(
  page.getByRole("heading", { name: "Seafood market today" }),
).toBeVisible();
await expect(page.getByRole("contentinfo")).toBeVisible();

const productCards = page.getByTestId("homepage-product-card");
expect(await productCards.count()).toBeGreaterThanOrEqual(24);

if (viewport.width >= 1024) {
  await expect(
    page.getByRole("complementary", { name: "Seafood categories" }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("complementary", { name: "Seafood categories" })
      .getByRole("link")
      .count(),
  ).toBeGreaterThanOrEqual(10);
}
```

In the `loads core storefront routes and checkout form` test, replace the old homepage section assertions with:

```ts
await expect(
  page.getByRole("heading", { name: "Seafood market today" }),
).toBeVisible();
await expect(page.getByText("Best sellers")).toBeVisible();
await expect(page.getByText("Flash seafood deals")).toBeVisible();
await expect(page.getByText("Value seafood from 29K")).toBeVisible();
await expect(page.getByText("Sushi and sashimi")).toBeVisible();
await expect(page.getByText("Frozen seafood")).toBeVisible();
await expect(page.getByText("Ready to eat")).toBeVisible();
```

- [ ] **Step 2: Run the targeted E2E test and confirm it fails**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected result before implementation: FAIL because `Seafood market today` and `homepage-product-card` do not exist yet.

- [ ] **Step 3: Commit the failing acceptance test only if committing is part of this run**

Use explicit paths so `AGENTS.md` is not staged:

```bash
git add tests/e2e/storefront-checkout.spec.ts
git commit -m "test: tighten homepage density smoke coverage"
```

Skip this commit step if the user asks for one final commit instead.

---

### Task 2: Move And Expand Storefront Playwright Fixtures

**Files:**
- Modify: `src/features/cms/playwright-fixtures.ts`
- Modify: `app/(storefront)/page.tsx`

- [ ] **Step 1: Move homepage fixture ownership into the CMS fixture module**

In `src/features/cms/playwright-fixtures.ts`, import the missing type:

```ts
import type { HomePageContent, StorefrontChrome } from "./types";
```

Add a reusable compact product factory near the top of the file:

```ts
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
}) {
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
  };
}
```

- [ ] **Step 2: Expand chrome fixture navigation**

Replace the current one-item `headerNav` and `sidebarNav` values with these 12 items:

```ts
const categoryNavItems = [
  ["Best sellers", "/categories/best-sellers", "star"],
  ["Promotions", "/categories/promotions", "badge-percent"],
  ["Sushi and sashimi", "/categories/sashimi", "fish"],
  ["Fresh seafood", "/categories/fresh-seafood", "waves"],
  ["Frozen seafood", "/categories/frozen-seafood", "snowflake"],
  ["Live seafood", "/categories/live-seafood", "waves"],
  ["Imported seafood", "/categories/imported-seafood", "ship"],
  ["Salmon", "/categories/salmon", "fish"],
  ["Oyster and shellfish", "/categories/oyster-shellfish", "shell"],
  ["Crab and lobster", "/categories/crab-lobster", "fish"],
  ["Shrimp and squid", "/categories/shrimp-squid", "fish"],
  ["Ready to eat", "/categories/ready-to-eat", "utensils"],
] as const;
```

Map this into `headerNav` with the first five items and into `sidebarNav` with all items:

```ts
headerNav: categoryNavItems.slice(0, 5).map(([label, href, iconKey], index) => ({
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
```

- [ ] **Step 3: Add exact rail helpers for the dense homepage fixture**

Add these helpers after `fixtureProduct`:

```ts
const fixtureProducts = {
  alaskaLobster: fixtureProduct({
    slug: "alaska-lobster-500g",
    name: "Alaska lobster 500g",
    imageText: "Alaska Lobster",
    price: 499000,
    compareAtPrice: 745000,
    badgeText: "Hot",
    unitLabel: "1 con",
    soldLabel: "Sold 120",
  }),
  koreanAbalone: fixtureProduct({
    slug: "korean-abalone-live",
    name: "Korean abalone live",
    imageText: "Korean Abalone",
    price: 65000,
    compareAtPrice: 99000,
    badgeText: "Live",
    unitLabel: "1 con",
    soldLabel: "Sold 86",
  }),
  freshSalmon: fixtureProduct({
    slug: "fresh-salmon-loin",
    name: "Fresh salmon loin",
    imageText: "Fresh Salmon",
    price: 249000,
    badgeText: "Fresh",
    unitLabel: "tray 200g",
    soldLabel: "Sold 64",
  }),
  blackTigerShrimp: fixtureProduct({
    slug: "black-tiger-shrimp",
    name: "Black tiger shrimp",
    imageText: "Tiger Shrimp",
    price: 229000,
    compareAtPrice: 260000,
    badgeText: "Fresh",
    unitLabel: "kg",
    soldLabel: "Sold 91",
  }),
  greenLobster: fixtureProduct({
    slug: "green-lobster-live",
    name: "Green lobster live",
    imageText: "Green Lobster",
    price: 429000,
    compareAtPrice: 535000,
    badgeText: "Flash",
    unitLabel: "con 350g",
    soldLabel: "Sold 42",
  }),
  peeledShrimp: fixtureProduct({
    slug: "peeled-white-shrimp",
    name: "Peeled white shrimp",
    imageText: "Peeled Shrimp",
    price: 69000,
    compareAtPrice: 79000,
    badgeText: "Save",
    unitLabel: "tray 150g",
    soldLabel: "Sold 75",
  }),
  hotpotCombo: fixtureProduct({
    slug: "seafood-hotpot-combo",
    name: "Seafood hotpot combo",
    imageText: "Hotpot Combo",
    price: 399000,
    compareAtPrice: 459000,
    badgeText: "Combo",
    unitLabel: "combo",
    soldLabel: "Sold 58",
  }),
  lobsterTail: fixtureProduct({
    slug: "lobster-tail-pack",
    name: "Lobster tail pack",
    imageText: "Lobster Tail",
    price: 489000,
    compareAtPrice: 530000,
    badgeText: "Save",
    unitLabel: "pack",
    soldLabel: "Sold 36",
  }),
  sashimiMix: fixtureProduct({
    slug: "sashimi-mix-family",
    name: "Family sashimi mix",
    imageText: "Sashimi Mix",
    price: 799000,
    compareAtPrice: 965000,
    badgeText: "Fresh",
    unitLabel: "combo",
    soldLabel: "Sold 31",
  }),
  shrimpMaki: fixtureProduct({
    slug: "shrimp-teriyaki-maki",
    name: "Shrimp teriyaki maki",
    imageText: "Shrimp Maki",
    price: 99000,
    badgeText: "Ready",
    unitLabel: "portion",
    soldLabel: "Sold 69",
  }),
  salmonSaku: fixtureProduct({
    slug: "norway-salmon-saku",
    name: "Norway salmon saku",
    imageText: "Salmon Saku",
    price: 320000,
    badgeText: "Chilled",
    unitLabel: "tray 250g",
    soldLabel: "Sold 44",
  }),
  ikuraSushi: fixtureProduct({
    slug: "ikura-sushi-pack",
    name: "Ikura sushi pack",
    imageText: "Ikura Sushi",
    price: 219000,
    badgeText: "New",
    unitLabel: "pack",
    soldLabel: "Sold 28",
  }),
  tigerPrawn: fixtureProduct({
    slug: "tiger-prawn-live",
    name: "Live tiger prawn",
    imageText: "Tiger Prawn",
    price: 420000,
    badgeText: "Live",
    unitLabel: "kg",
    soldLabel: "Sold 53",
  }),
  blueCrab: fixtureProduct({
    slug: "blue-crab-live",
    name: "Live blue crab",
    imageText: "Blue Crab",
    price: 369000,
    compareAtPrice: 390000,
    badgeText: "Live",
    unitLabel: "1kg",
    soldLabel: "Sold 49",
  }),
  clamCombo: fixtureProduct({
    slug: "clam-combo",
    name: "Three clam combo",
    imageText: "Clam Combo",
    price: 119000,
    badgeText: "Fresh",
    unitLabel: "combo",
    soldLabel: "Sold 57",
  }),
  canadaOyster: fixtureProduct({
    slug: "canada-oyster-half-shell",
    name: "Canada oyster half shell",
    imageText: "Canada Oyster",
    price: 290000,
    badgeText: "Chilled",
    unitLabel: "box",
    soldLabel: "Sold 33",
  }),
  scallopMeat: fixtureProduct({
    slug: "japanese-scallop-meat",
    name: "Japanese scallop meat",
    imageText: "Scallop",
    price: 349000,
    compareAtPrice: 389000,
    badgeText: "Imported",
    unitLabel: "tray 250g",
    soldLabel: "Sold 46",
  }),
  squidRing: fixtureProduct({
    slug: "squid-ring-tray",
    name: "Squid ring tray",
    imageText: "Squid Ring",
    price: 99000,
    compareAtPrice: 125000,
    badgeText: "Save",
    unitLabel: "tray 300g",
    soldLabel: "Sold 82",
  }),
  babyOctopus: fixtureProduct({
    slug: "baby-octopus-tray",
    name: "Baby octopus tray",
    imageText: "Baby Octopus",
    price: 145000,
    badgeText: "Frozen",
    unitLabel: "tray 300g",
    soldLabel: "Sold 52",
  }),
  clamMeat: fixtureProduct({
    slug: "clam-meat-pack",
    name: "Clam meat pack",
    imageText: "Clam Meat",
    price: 69000,
    badgeText: "Frozen",
    unitLabel: "pack 250g",
    soldLabel: "Sold 67",
  }),
  salmonBowl: fixtureProduct({
    slug: "ready-meal-salmon-soy",
    name: "Soy-marinated salmon bowl",
    imageText: "Salmon Bowl",
    price: 179000,
    badgeText: "Ready",
    unitLabel: "tray",
    soldLabel: "Sold 74",
  }),
  salmonTeriyaki: fixtureProduct({
    slug: "grilled-salmon-teriyaki",
    name: "Grilled salmon teriyaki",
    imageText: "Salmon Teriyaki",
    price: 189000,
    badgeText: "Ready",
    unitLabel: "tray",
    soldLabel: "Sold 39",
  }),
  seaweedSalad: fixtureProduct({
    slug: "seaweed-salad-box",
    name: "Seaweed salad box",
    imageText: "Seaweed Salad",
    price: 59000,
    badgeText: "Chilled",
    unitLabel: "box",
    soldLabel: "Sold 93",
  }),
  snowCrab: fixtureProduct({
    slug: "snow-crab-cluster",
    name: "Snow crab cluster",
    imageText: "Snow Crab",
    price: 629000,
    compareAtPrice: 690000,
    badgeText: "Frozen",
    unitLabel: "kg",
    soldLabel: "Sold 27",
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
}: {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  sortOrder: number;
  viewMoreHref: string;
  products: HomePageContent["sections"][number]["products"];
  type?: "product_rail" | "flash_sale";
}): HomePageContent["sections"][number] {
  return {
    id,
    key,
    type,
    title,
    subtitle,
    layout: "dense_grid",
    sortOrder,
    metadata: { viewMoreHref },
    banners: [],
    products,
  };
}
```

- [ ] **Step 4: Export the exact dense homepage fixture**

Export `playwrightHomeFixture` from `src/features/cms/playwright-fixtures.ts`:

```ts
export const playwrightHomeFixture: HomePageContent = {
  sections: [
    {
      id: "e2e-hero",
      key: "hero",
      type: "hero",
      title: "Seafood market today",
      subtitle: "Fresh seafood deals from Dao Seafood",
      layout: "dao_market_grid",
      sortOrder: 10,
      metadata: {},
      banners: [
        {
          id: "e2e-hero-primary",
          title: "Seafood week value picks",
          subtitle: "Original placeholder artwork for seasonal seafood offers.",
          imageUrl:
            "https://placehold.co/1200x430/0284c7/ffffff?text=Dao+Seafood+Market",
          mobileImageUrl:
            "https://placehold.co/720x360/0284c7/ffffff?text=Seafood+Market",
          ctaLabel: "Shop now",
          ctaHref: "/search?q=seafood",
          sortOrder: 10,
        },
        {
          id: "e2e-hero-value",
          title: "Value seafood from 29K",
          subtitle: "Daily portions for family meals.",
          imageUrl:
            "https://placehold.co/600x210/f97316/ffffff?text=Value+29K",
          mobileImageUrl:
            "https://placehold.co/720x320/f97316/ffffff?text=Value+Picks",
          ctaLabel: "View deals",
          ctaHref: "/categories/promotions",
          sortOrder: 20,
        },
        {
          id: "e2e-hero-sashimi",
          title: "Sushi and sashimi",
          subtitle: "Prepared fresh daily with placeholder imagery.",
          imageUrl:
            "https://placehold.co/600x210/16a34a/ffffff?text=Sashimi",
          mobileImageUrl:
            "https://placehold.co/720x320/16a34a/ffffff?text=Sashimi",
          ctaLabel: "View sashimi",
          ctaHref: "/categories/sashimi",
          sortOrder: 30,
        },
      ],
      products: [],
    },
    {
      id: "e2e-category-shortcuts",
      key: "category-shortcuts",
      type: "category_shortcuts",
      title: "Shop by category",
      subtitle: "Popular seafood paths",
      layout: "compact_grid",
      sortOrder: 20,
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
      title: "Best sellers",
      subtitle: "Customer favorites this week",
      sortOrder: 30,
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
      title: "Flash seafood deals",
      subtitle: "Limited-time price drops",
      sortOrder: 40,
      viewMoreHref: "/categories/promotions",
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
      title: "Fresh value picks from 29K",
      subtitle: "Everyday seafood for family meals",
      layout: "wide_banner",
      sortOrder: 50,
      metadata: {},
      banners: [
        {
          id: "e2e-budget-banner",
          title: "Value seafood from 29K",
          subtitle: "Daily family picks with practical portions.",
          imageUrl:
            "https://placehold.co/1400x260/0ea5e9/ffffff?text=Fresh+Value+Picks",
          mobileImageUrl:
            "https://placehold.co/720x320/0ea5e9/ffffff?text=Value+Picks",
          ctaLabel: "Shop value picks",
          ctaHref: "/categories/promotions",
          sortOrder: 10,
        },
      ],
      products: [],
    },
    fixtureRail({
      id: "e2e-sashimi",
      key: "sashimi",
      title: "Sushi and sashimi",
      subtitle: "Chilled ready-to-eat selections",
      sortOrder: 60,
      viewMoreHref: "/categories/sashimi",
      products: [
        fixtureProducts.sashimiMix,
        fixtureProducts.shrimpMaki,
        fixtureProducts.salmonSaku,
        fixtureProducts.ikuraSushi,
      ],
    }),
    fixtureRail({
      id: "e2e-fresh-seafood",
      key: "fresh-seafood",
      title: "Fresh seafood",
      subtitle: "Live and fresh picks",
      sortOrder: 70,
      viewMoreHref: "/categories/fresh-seafood",
      products: [
        fixtureProducts.tigerPrawn,
        fixtureProducts.blueCrab,
        fixtureProducts.clamCombo,
        fixtureProducts.canadaOyster,
      ],
    }),
    fixtureRail({
      id: "e2e-frozen-seafood",
      key: "frozen-seafood",
      title: "Frozen seafood",
      subtitle: "Freezer-ready portions",
      sortOrder: 80,
      viewMoreHref: "/categories/frozen-seafood",
      products: [
        fixtureProducts.scallopMeat,
        fixtureProducts.squidRing,
        fixtureProducts.babyOctopus,
        fixtureProducts.clamMeat,
      ],
    }),
    fixtureRail({
      id: "e2e-ready-to-eat",
      key: "ready-to-eat",
      title: "Ready to eat",
      subtitle: "Prepared seafood meals",
      sortOrder: 90,
      viewMoreHref: "/categories/ready-to-eat",
      products: [
        fixtureProducts.salmonBowl,
        fixtureProducts.salmonTeriyaki,
        fixtureProducts.seaweedSalad,
        fixtureProducts.snowCrab,
      ],
    }),
  ],
};
```

- [ ] **Step 5: Import fixtures from the fixture module in the homepage**

In `app/(storefront)/page.tsx`, remove local `playwrightChromeFixture`, `playwrightHomeFixture`, and `shouldUsePlaywrightFixture`.

Add:

```ts
import {
  playwrightChromeFixture,
  playwrightHomeFixture,
  shouldUseStorefrontPlaywrightFixture,
} from "@/src/features/cms/playwright-fixtures";
```

Update the loader functions:

```ts
async function loadStorefrontChrome(
  client: SupabaseClient,
): Promise<StorefrontChrome> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return playwrightChromeFixture;
  }

  return getStorefrontChrome(client);
}

async function loadHomePageContent(client: SupabaseClient): Promise<HomePageContent> {
  if (shouldUseStorefrontPlaywrightFixture()) {
    return playwrightHomeFixture;
  }

  return getHomePageContent(client);
}
```

- [ ] **Step 6: Run unit and type checks for the fixture move**

Run:

```bash
pnpm test src/features/cms/queries.test.ts
pnpm exec tsc --noEmit
```

Expected: both pass.

---

### Task 3: Expand Supabase Seed Merchandising Data

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Expand category seed to match the homepage navigation**

In the `category_seed` JSON, include these slugs and names:

```json
[
  { "slug": "best-sellers", "name": "Best sellers" },
  { "slug": "promotions", "name": "Promotions" },
  { "slug": "sashimi", "name": "Sushi and sashimi" },
  { "slug": "fresh-seafood", "name": "Fresh seafood" },
  { "slug": "frozen-seafood", "name": "Frozen seafood" },
  { "slug": "live-seafood", "name": "Live seafood" },
  { "slug": "imported-seafood", "name": "Imported seafood" },
  { "slug": "salmon", "name": "Salmon" },
  { "slug": "oyster-shellfish", "name": "Oyster and shellfish" },
  { "slug": "crab-lobster", "name": "Crab and lobster" },
  { "slug": "shrimp-squid", "name": "Shrimp and squid" },
  { "slug": "ready-to-eat", "name": "Ready to eat" }
]
```

Each record must keep `description`, `image`, and `sort` fields because the existing SQL expects them.

- [ ] **Step 2: Expand product seed to 24 products**

Keep the existing 10 products and add these 14 records to the `product_seed` JSON, producing 24 seeded products:

```json
[
  { "slug": "canada-oyster-half-shell", "name": "Canada oyster half shell", "category": "oyster-shellfish", "temperature": "chilled", "origin": "Canada", "price": 290000, "sale": null, "unit": "box", "summary": "Chilled oyster half-shell box", "image": "https://placehold.co/900x700/e0f2fe/0f172a?text=Canada+Oyster" },
  { "slug": "japanese-scallop-meat", "name": "Japanese scallop meat", "category": "imported-seafood", "temperature": "frozen", "origin": "Japan", "price": 389000, "sale": 349000, "unit": "tray 250g", "summary": "Frozen scallop meat tray", "image": "https://placehold.co/900x700/e0f7fa/0f172a?text=Scallop" },
  { "slug": "norway-salmon-saku", "name": "Norway salmon saku", "category": "salmon", "temperature": "chilled", "origin": "Norway", "price": 320000, "sale": null, "unit": "tray 250g", "summary": "Saku-cut salmon portion", "image": "https://placehold.co/900x700/fee2e2/0f172a?text=Salmon+Saku" },
  { "slug": "snow-crab-cluster", "name": "Snow crab cluster", "category": "crab-lobster", "temperature": "frozen", "origin": "Imported", "price": 690000, "sale": 629000, "unit": "kg", "summary": "Frozen snow crab cluster", "image": "https://placehold.co/900x700/ede9fe/0f172a?text=Snow+Crab" },
  { "slug": "tiger-prawn-live", "name": "Live tiger prawn", "category": "live-seafood", "temperature": "live", "origin": "Vietnam", "price": 420000, "sale": null, "unit": "kg", "summary": "Live tiger prawn by kilogram", "image": "https://placehold.co/900x700/dcfce7/0f172a?text=Tiger+Prawn" },
  { "slug": "squid-ring-tray", "name": "Squid ring tray", "category": "shrimp-squid", "temperature": "frozen", "origin": "Vietnam", "price": 125000, "sale": 99000, "unit": "tray 300g", "summary": "Frozen squid rings", "image": "https://placehold.co/900x700/e0f2fe/0f172a?text=Squid+Ring" },
  { "slug": "seafood-hotpot-combo", "name": "Seafood hotpot combo", "category": "promotions", "temperature": "fresh", "origin": "Dao Seafood Kitchen", "price": 459000, "sale": 399000, "unit": "combo", "summary": "Mixed seafood hotpot combo", "image": "https://placehold.co/900x700/fef3c7/0f172a?text=Hotpot+Combo" },
  { "slug": "grilled-salmon-teriyaki", "name": "Grilled salmon teriyaki", "category": "ready-to-eat", "temperature": "ready", "origin": "Dao Seafood Kitchen", "price": 189000, "sale": null, "unit": "tray", "summary": "Prepared salmon teriyaki tray", "image": "https://placehold.co/900x700/ffedd5/0f172a?text=Salmon+Teriyaki" },
  { "slug": "ikura-sushi-pack", "name": "Ikura sushi pack", "category": "sashimi", "temperature": "chilled", "origin": "Dao Seafood Kitchen", "price": 219000, "sale": null, "unit": "pack", "summary": "Chilled ikura sushi pack", "image": "https://placehold.co/900x700/fce7f3/0f172a?text=Ikura+Sushi" },
  { "slug": "baby-octopus-tray", "name": "Baby octopus tray", "category": "shrimp-squid", "temperature": "frozen", "origin": "Vietnam", "price": 145000, "sale": null, "unit": "tray 300g", "summary": "Frozen baby octopus tray", "image": "https://placehold.co/900x700/e0f2fe/0f172a?text=Baby+Octopus" },
  { "slug": "black-tiger-shrimp", "name": "Black tiger shrimp", "category": "shrimp-squid", "temperature": "fresh", "origin": "Vietnam", "price": 260000, "sale": 229000, "unit": "kg", "summary": "Fresh black tiger shrimp", "image": "https://placehold.co/900x700/e0f7fa/0f172a?text=Tiger+Shrimp" },
  { "slug": "lobster-tail-pack", "name": "Lobster tail pack", "category": "crab-lobster", "temperature": "frozen", "origin": "Imported", "price": 530000, "sale": 489000, "unit": "pack", "summary": "Frozen lobster tail pack", "image": "https://placehold.co/900x700/ede9fe/0f172a?text=Lobster+Tail" },
  { "slug": "clam-meat-pack", "name": "Clam meat pack", "category": "frozen-seafood", "temperature": "frozen", "origin": "Vietnam", "price": 69000, "sale": null, "unit": "pack 250g", "summary": "Frozen clam meat pack", "image": "https://placehold.co/900x700/e0f2f1/0f172a?text=Clam+Meat" },
  { "slug": "seaweed-salad-box", "name": "Seaweed salad box", "category": "ready-to-eat", "temperature": "chilled", "origin": "Dao Seafood Kitchen", "price": 59000, "sale": null, "unit": "box", "summary": "Chilled seaweed salad", "image": "https://placehold.co/900x700/dcfce7/0f172a?text=Seaweed+Salad" }
]
```

- [ ] **Step 3: Expand product-category mapping**

Add these `product_category_seed` rows so each new product appears in its owning category and the listed merchandising category:

```json
[
  { "slug": "canada-oyster-half-shell", "category": "oyster-shellfish" },
  { "slug": "canada-oyster-half-shell", "category": "imported-seafood" },
  { "slug": "japanese-scallop-meat", "category": "imported-seafood" },
  { "slug": "japanese-scallop-meat", "category": "frozen-seafood" },
  { "slug": "norway-salmon-saku", "category": "salmon" },
  { "slug": "norway-salmon-saku", "category": "sashimi" },
  { "slug": "snow-crab-cluster", "category": "crab-lobster" },
  { "slug": "snow-crab-cluster", "category": "frozen-seafood" },
  { "slug": "tiger-prawn-live", "category": "live-seafood" },
  { "slug": "tiger-prawn-live", "category": "fresh-seafood" },
  { "slug": "squid-ring-tray", "category": "shrimp-squid" },
  { "slug": "squid-ring-tray", "category": "frozen-seafood" },
  { "slug": "seafood-hotpot-combo", "category": "promotions" },
  { "slug": "seafood-hotpot-combo", "category": "fresh-seafood" },
  { "slug": "grilled-salmon-teriyaki", "category": "ready-to-eat" },
  { "slug": "grilled-salmon-teriyaki", "category": "salmon" },
  { "slug": "ikura-sushi-pack", "category": "sashimi" },
  { "slug": "baby-octopus-tray", "category": "shrimp-squid" },
  { "slug": "baby-octopus-tray", "category": "frozen-seafood" },
  { "slug": "black-tiger-shrimp", "category": "shrimp-squid" },
  { "slug": "black-tiger-shrimp", "category": "fresh-seafood" },
  { "slug": "lobster-tail-pack", "category": "crab-lobster" },
  { "slug": "lobster-tail-pack", "category": "promotions" },
  { "slug": "clam-meat-pack", "category": "frozen-seafood" },
  { "slug": "clam-meat-pack", "category": "oyster-shellfish" },
  { "slug": "seaweed-salad-box", "category": "ready-to-eat" }
]
```

- [ ] **Step 4: Update CMS section seed titles and metadata**

Update the `hero` section to:

```json
{
  "section_key": "hero",
  "section_type": "hero",
  "title": "Seafood market today",
  "subtitle": "Fresh seafood deals from Dao Seafood",
  "layout": "dao_market_grid",
  "sort": 10,
  "metadata": {}
}
```

Update `category-shortcuts` metadata to include the category shortcut items from Task 2:

```json
{
  "section_key": "category-shortcuts",
  "section_type": "category_shortcuts",
  "title": "Shop by category",
  "subtitle": "Popular seafood paths",
  "layout": "compact_grid",
  "sort": 20,
  "metadata": {
    "items": [
      { "label": "Best sellers", "href": "/categories/best-sellers", "iconKey": "star" },
      { "label": "Promotions", "href": "/categories/promotions", "iconKey": "badge-percent" },
      { "label": "Sushi and sashimi", "href": "/categories/sashimi", "iconKey": "fish" },
      { "label": "Fresh seafood", "href": "/categories/fresh-seafood", "iconKey": "waves" },
      { "label": "Frozen seafood", "href": "/categories/frozen-seafood", "iconKey": "snowflake" },
      { "label": "Ready to eat", "href": "/categories/ready-to-eat", "iconKey": "utensils" }
    ]
  }
}
```

- [ ] **Step 5: Expand CMS section-product seed**

Each rendered rail should have 4 products. Use these 24 section assignments:

```json
[
  { "section": "best-sellers", "slug": "alaska-lobster-500g", "sort": 10, "badge": "Hot" },
  { "section": "best-sellers", "slug": "korean-abalone-live", "sort": 20, "badge": "Live" },
  { "section": "best-sellers", "slug": "fresh-salmon-loin", "sort": 30, "badge": "Fresh" },
  { "section": "best-sellers", "slug": "black-tiger-shrimp", "sort": 40, "badge": "Fresh" },
  { "section": "flash-sale", "slug": "green-lobster-live", "sort": 10, "badge": "Flash" },
  { "section": "flash-sale", "slug": "peeled-white-shrimp", "sort": 20, "badge": "Save" },
  { "section": "flash-sale", "slug": "seafood-hotpot-combo", "sort": 30, "badge": "Combo" },
  { "section": "flash-sale", "slug": "lobster-tail-pack", "sort": 40, "badge": "Save" },
  { "section": "sashimi", "slug": "sashimi-mix-family", "sort": 10, "badge": "Fresh" },
  { "section": "sashimi", "slug": "shrimp-teriyaki-maki", "sort": 20, "badge": "Ready" },
  { "section": "sashimi", "slug": "norway-salmon-saku", "sort": 30, "badge": "Chilled" },
  { "section": "sashimi", "slug": "ikura-sushi-pack", "sort": 40, "badge": "New" },
  { "section": "fresh-seafood", "slug": "tiger-prawn-live", "sort": 10, "badge": "Live" },
  { "section": "fresh-seafood", "slug": "blue-crab-live", "sort": 20, "badge": "Live" },
  { "section": "fresh-seafood", "slug": "clam-combo", "sort": 30, "badge": "Fresh" },
  { "section": "fresh-seafood", "slug": "green-lobster-live", "sort": 40, "badge": "Live" },
  { "section": "frozen-seafood", "slug": "peeled-white-shrimp", "sort": 10, "badge": "Frozen" },
  { "section": "frozen-seafood", "slug": "japanese-scallop-meat", "sort": 20, "badge": "Imported" },
  { "section": "frozen-seafood", "slug": "squid-ring-tray", "sort": 30, "badge": "Save" },
  { "section": "frozen-seafood", "slug": "baby-octopus-tray", "sort": 40, "badge": "Frozen" },
  { "section": "ready-to-eat", "slug": "ready-meal-salmon-soy", "sort": 10, "badge": "Ready" },
  { "section": "ready-to-eat", "slug": "grilled-salmon-teriyaki", "sort": 20, "badge": "Ready" },
  { "section": "ready-to-eat", "slug": "seaweed-salad-box", "sort": 30, "badge": "Chilled" },
  { "section": "ready-to-eat", "slug": "shrimp-teriyaki-maki", "sort": 40, "badge": "Ready" }
]
```

- [ ] **Step 6: Validate seed SQL syntax**

Run:

```bash
pnpm lint
```

Expected: pass. SQL syntax is fully validated when the local Supabase/Postgres stack applies the seed.

---

### Task 4: Add Category Shortcut Section Rendering

**Files:**
- Create: `components/storefront/category-shortcut-strip.tsx`
- Modify: `app/(storefront)/page.tsx`

- [ ] **Step 1: Create the category shortcut component**

Create `components/storefront/category-shortcut-strip.tsx`:

```tsx
import Link from "next/link";
import type { CmsSection } from "@/src/features/cms/types";
import { NavigationItemIcon } from "./category-nav";

type CategoryShortcut = {
  label: string;
  href: string;
  iconKey: string | null;
};

type CategoryShortcutStripProps = {
  section: CmsSection;
};

function isShortcut(value: unknown): value is CategoryShortcut {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.label === "string" &&
    candidate.label.length > 0 &&
    typeof candidate.href === "string" &&
    candidate.href.length > 0
  );
}

function getShortcuts(section: CmsSection): CategoryShortcut[] {
  const items = section.metadata.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter(isShortcut).map((item) => ({
    label: item.label,
    href: item.href,
    iconKey: item.iconKey,
  }));
}

export function CategoryShortcutStrip({ section }: CategoryShortcutStripProps) {
  const shortcuts = getShortcuts(section);
  const headingId = `home-section-${section.id}`;

  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={headingId} className="bg-white">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          {section.title ? (
            <h2 id={headingId} className="text-base font-bold text-slate-950">
              {section.title}
            </h2>
          ) : null}
          {section.subtitle ? (
            <p className="mt-1 text-xs text-slate-600">{section.subtitle}</p>
          ) : null}
        </div>
      </div>
      <nav
        aria-label="Popular seafood categories"
        className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6"
      >
        {shortcuts.map((shortcut) => (
          <Link
            key={`${shortcut.href}-${shortcut.label}`}
            href={shortcut.href}
            className="flex min-h-16 flex-col items-center justify-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 text-center text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800"
          >
            <NavigationItemIcon
              iconKey={shortcut.iconKey}
              className="h-5 w-5 text-teal-700"
            />
            <span className="line-clamp-2">{shortcut.label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
```

- [ ] **Step 2: Wire the section type in the homepage renderer**

In `app/(storefront)/page.tsx`, add:

```ts
import { CategoryShortcutStrip } from "@/components/storefront/category-shortcut-strip";
```

Add this case to `renderHomeSection`:

```tsx
case "category_shortcuts":
  return <CategoryShortcutStrip key={section.id} section={section} />;
```

- [ ] **Step 3: Verify the component compiles**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: pass.

---

### Task 5: Redesign Hero Into A Compact Commerce Banner Grid

**Files:**
- Modify: `components/storefront/hero-merchandising-grid.tsx`

- [ ] **Step 1: Reduce hero height and remove the editorial card feel**

In `HeroMerchandisingGrid`, keep the section heading but make it compact:

```tsx
<div className="mb-3 flex items-end justify-between gap-3">
  <div>
    {section.title ? (
      <h1
        id={headingId}
        className="text-xl font-bold text-slate-950 md:text-2xl"
      >
        {section.title}
      </h1>
    ) : null}
    {section.subtitle ? (
      <p className="mt-1 text-sm text-slate-600">{section.subtitle}</p>
    ) : null}
  </div>
</div>
```

Change the featured banner class from the tall 390px hero to:

```tsx
className="group relative min-h-[190px] overflow-hidden rounded bg-teal-900 text-white md:min-h-[280px]"
```

Change the featured title class from `text-3xl md:text-5xl` to:

```tsx
className="max-w-md text-2xl font-bold leading-tight md:text-4xl"
```

- [ ] **Step 2: Make side promo banners commerce-sized**

Change `CompactBanner` wrapper to:

```tsx
className="group relative min-h-[132px] overflow-hidden rounded bg-slate-900 text-white md:min-h-[134px]"
```

Keep the image and overlay, but reduce text to:

```tsx
<h3 className="text-sm font-bold leading-5 md:text-base">{banner.title}</h3>
```

- [ ] **Step 3: Make mobile hero compact instead of stacked giant cards**

Change the hero grid wrapper to:

```tsx
<div className="grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
```

Change the compact banners wrapper to:

```tsx
<div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
```

Expected visual result: mobile shows a compact main banner and two smaller promo tiles before product sections, not three oversized editorial panels.

- [ ] **Step 4: Verify the hero heading still exists**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts --grep "storefront homepage renders"
```

Expected at this stage: still fails on product-card/category density if later tasks are not done, but it no longer fails because `Seafood market today` is missing.

---

### Task 6: Make Product Rails And Cards Dense

**Files:**
- Modify: `components/storefront/product-rail.tsx`
- Modify: `components/storefront/product-grid.tsx`
- Modify: `components/storefront/product-card.tsx`

- [ ] **Step 1: Flatten product rail sections**

In `ProductRail`, change the section wrapper from a rounded card to a full white commerce block:

```tsx
className="border border-slate-200 bg-white p-3"
```

Change the heading row to:

```tsx
<div className="mb-3 flex min-h-9 items-center justify-between gap-3 border-b border-slate-200 pb-2">
```

Change the heading typography to:

```tsx
className="text-base font-bold text-slate-950 md:text-lg"
```

Keep `ViewMoreLink`, but reduce its class to:

```tsx
"inline-flex min-h-8 shrink-0 items-center gap-1 rounded border border-orange-200 px-2.5 text-xs font-semibold text-orange-600 transition hover:border-orange-500 hover:text-orange-700"
```

- [ ] **Step 2: Keep the dense grid consistently 2/3/5 columns**

In `ProductGrid`, set the dense grid class to:

```ts
const gridClassName =
  density === "dense"
    ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    : "grid grid-cols-2 gap-3 md:grid-cols-4";
```

This may already match the current file. Keep it unless implementation finds a better responsive result during screenshot review.

- [ ] **Step 3: Add a test id and compact card styling**

In `ProductCard`, add the test id to the article:

```tsx
<article
  data-testid="homepage-product-card"
  className="group relative h-full overflow-hidden rounded border border-slate-200 bg-white p-1.5 pb-10 transition hover:border-teal-500 hover:shadow-sm"
>
```

Show `unitLabel` under the product name:

```tsx
{"unitLabel" in product && product.unitLabel ? (
  <div className="mt-1 text-[11px] font-medium text-slate-500">
    {product.unitLabel}
  </div>
) : null}
```

Change the product name to a compact two-line block:

```tsx
<h3 className="mt-2 line-clamp-2 min-h-9 text-xs font-semibold leading-[18px] text-slate-950 md:text-sm">
  {product.name}
</h3>
```

Change the add button to:

```tsx
className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded bg-orange-500 text-white opacity-80 shadow-sm disabled:cursor-not-allowed"
```

- [ ] **Step 4: Confirm product density exists in the DOM**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts --grep "storefront homepage renders"
```

Expected after fixture expansion and card test id are complete: the homepage render tests pass and screenshots are written to:

```text
test-results/storefront-home-390.png
test-results/storefront-home-1440.png
```

---

### Task 7: Tune Header And Sidebar To Match The Commerce Rhythm

**Files:**
- Modify: `components/storefront/storefront-header.tsx`
- Modify: `components/storefront/category-sidebar.tsx`
- Modify: `app/(storefront)/page.tsx`

- [ ] **Step 1: Make the sidebar category label match the acceptance test**

In `CategorySidebar`, change the `aside` label:

```tsx
aria-label="Seafood categories"
```

Change the visible label from `Categories` to:

```tsx
Seafood categories
```

Keep the sidebar hidden below `lg`.

- [ ] **Step 2: Reduce main page gutters so the homepage is denser**

In `app/(storefront)/page.tsx`, change the main content container:

```tsx
<div className="mx-auto flex max-w-7xl gap-4 px-3 py-4 md:px-4">
```

Change the content stack:

```tsx
<div className="min-w-0 flex-1 space-y-4">
```

- [ ] **Step 3: Make header nav feel more like a storefront bar**

In `StorefrontHeader`, keep the top utility bar and search, but reduce vertical whitespace:

```tsx
<div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:px-4">
```

Update the top utility container width to `max-w-7xl`.

Keep the existing `Dao Seafood`, search, hotline, account, and cart controls.

- [ ] **Step 4: Run a targeted screenshot pass**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts --grep "storefront homepage renders"
```

Open:

```text
test-results/storefront-home-390.png
test-results/storefront-home-1440.png
```

Acceptance criteria:

- Desktop first viewport shows header, category sidebar, compact hero, and the beginning of product merchandising.
- Mobile first viewport shows header/search, compact hero, category shortcuts, and the beginning of product cards.
- No text overlaps cards, buttons, fixed dock, or product prices.
- The page does not read as a sparse landing page.

---

### Task 8: Full Verification And Cleanup

**Files:**
- No new files unless test output indicates a required fix.

- [ ] **Step 1: Run the standard checks**

Run:

```bash
pnpm lint
pnpm test
pnpm exec tsc --noEmit
pnpm exec playwright test
git diff --check
```

Expected:

- ESLint passes.
- Vitest passes all tests.
- TypeScript passes.
- Playwright passes all E2E tests.
- `git diff --check` reports no whitespace errors.

- [ ] **Step 2: Inspect generated screenshots**

Open:

```text
test-results/storefront-home-390.png
test-results/storefront-home-1440.png
```

Confirm:

- At least 10 category links exist on desktop.
- At least 24 product cards exist on the homepage.
- Product cards are compact enough that multiple products are visible above the fold.
- The visual hierarchy is header/category/promo/products, not a large editorial hero.
- Placeholder seafood assets render and are not blank.

- [ ] **Step 3: Check git status before any commit**

Run:

```bash
git status --short
```

Expected implementation changes:

```text
 M app/(storefront)/page.tsx
 M components/storefront/category-sidebar.tsx
 M components/storefront/hero-merchandising-grid.tsx
 M components/storefront/product-card.tsx
 M components/storefront/product-grid.tsx
 M components/storefront/product-rail.tsx
 M components/storefront/storefront-header.tsx
 M src/features/cms/playwright-fixtures.ts
 M supabase/seed.sql
 M tests/e2e/storefront-checkout.spec.ts
?? components/storefront/category-shortcut-strip.tsx
```

`AGENTS.md` may still appear as modified from prior user instructions. Do not stage it.

- [ ] **Step 4: Commit only the homepage density pass if requested**

Use explicit paths:

```bash
git add \
  'app/(storefront)/page.tsx' \
  components/storefront/category-sidebar.tsx \
  components/storefront/category-shortcut-strip.tsx \
  components/storefront/hero-merchandising-grid.tsx \
  components/storefront/product-card.tsx \
  components/storefront/product-grid.tsx \
  components/storefront/product-rail.tsx \
  components/storefront/storefront-header.tsx \
  src/features/cms/playwright-fixtures.ts \
  supabase/seed.sql \
  tests/e2e/storefront-checkout.spec.ts
git commit -m "feat: densify dao seafood homepage"
```

---

## Self-Review

- Spec coverage: The plan addresses the exact reported mismatch by changing visual density, category prominence, compact hero merchandising, product card density, fixture data, and Supabase seed data.
- Placeholder scan: No task depends on an undefined file or vague implementation step.
- Type consistency: The plan reuses existing `CmsSection`, `HomePageContent`, `StorefrontChrome`, `CmsNavigationItem`, and `CmsProductCard` shapes. The only new component parses `section.metadata.items` locally without schema changes.
- Scope check: This is public homepage only. Admin UI, checkout behavior, payment flows, and database schema are intentionally out of scope.
