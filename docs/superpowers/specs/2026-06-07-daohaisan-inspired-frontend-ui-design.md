# Daohaisan-Inspired Frontend UI Design

## Goal

Build a daohaisan.vn-inspired public storefront and seafood operations admin UI for this Next.js/Supabase commerce platform. The UI should match the reference site's dense Vietnamese seafood-commerce feel while using original branding, original or placeholder seafood assets, and Supabase-backed data from the start.

## Non-Goals

- Do not copy daohaisan.vn proprietary images, logos, branding, or prose.
- Do not imitate daohaisan.vn's private admin UI because it is not public.
- Do not add Redis, background workers, queue consumers, or CDN-specific behavior.
- Do not hard-code homepage merchandising content inside React components.

## Approved Scope

### Public Storefront

The public storefront includes:

- Homepage
- Category listing
- Search listing
- Product detail
- Cart
- Checkout
- Storefront header and navigation
- Floating contact actions
- Mobile bottom utility dock
- Full footer

The visual direction is a dense commerce layout with strong merchandising, small product cards, frequent promo surfaces, visible hotline/contact access, and mobile-first shopping affordances.

### Admin UI

The admin UI covers the existing operations modules in this repository:

- Dashboard
- Products
- Orders
- Inventory
- Purchase orders
- Refunds
- Complaints
- Content
- Reports

The admin should feel like a restrained operations tool, not a marketing site.

## Architecture

The app remains a single Next.js App Router modular monolith.

Public pages use server components and feature loaders to read Supabase data. Admin pages use server components and existing permission helpers to read and mutate operational data. Shared UI components live under `components/`, while domain-specific loading and validation stays under `src/features/`.

### Standard Public Data Flow

1. A storefront page loads CMS section definitions from Supabase.
2. The page resolves product rails by section configuration.
3. The page composes reusable storefront components with typed data.
4. Cart and checkout keep using the current cart and checkout modules.
5. Mutations validate inputs with Zod and write through server actions or route handlers.

### Standard Admin Data Flow

1. An admin page loads the current user and required permission context.
2. The page reads operational rows from Supabase or existing RPC wrappers.
3. Tables render status chips, filters, actions, and empty states.
4. Mutations validate inputs with Zod, enforce permissions, and revalidate affected paths.

## CMS And Merchandising Schema

Add a small Supabase-backed presentation layer, not a full CMS.

### Tables

| Table | Purpose |
|-------|---------|
| `cms_pages` | Stores page keys, titles, and publish status. |
| `cms_sections` | Stores page sections with type, title, subtitle, layout, sort order, schedule, and metadata JSON. |
| `cms_banners` | Stores banner images, mobile images, text, CTA labels, CTA hrefs, and sort order. |
| `cms_section_products` | Manually assigns products to merchandising sections with sort order and optional badge text. |
| `cms_navigation_items` | Stores header, sidebar, mobile dock, and footer navigation items. |
| `cms_footer_links` | Stores grouped footer links. |
| `cms_brand_assets` | Stores partner, payment, trust, and brand assets by placement. |

### Section Types

Initial supported section types:

- `hero`
- `service_strip`
- `category_shortcuts`
- `product_rail`
- `flash_sale`
- `promo_band`
- `recommendation_tabs`
- `partner_strip`
- `content_highlights`
- `footer`

### Seed Content

Seed original placeholder content for:

- Brand name: `Dao Seafood`
- Homepage hero banners
- Small promo tiles
- Category shortcuts
- Best sellers
- Flash sale
- Budget promo band
- Recommendation tabs
- Sashimi rail
- Fresh seafood rail
- Frozen seafood rail
- Ready-to-eat rail
- Partner/trust/payment strips
- Footer groups

Seed assets must be original generated assets, neutral placeholder URLs, or locally owned placeholders.

## Public Storefront Design

### Desktop

The desktop storefront uses:

- Sticky commerce header with brand, hotline, search, account, cart, and delivery message.
- Horizontal category navigation.
- Homepage left category sidebar.
- Hero grid with one large banner and smaller stacked promo tiles.
- Service/category shortcut strip.
- Dense product rails and grids.
- Product cards with sale badge, option badge, sold count, old price, unit price, and add button.
- Promo bands between product sections.
- Floating contact stack for Messenger, Zalo, and hotline.
- Large footer with policy links, product links, partner/payment blocks, and company/contact details.

### Mobile

The mobile storefront uses:

- Compact top header with logo, search, and cart.
- Horizontal scroll category chips.
- Two-column product grids where space allows.
- Tight promo sections that preserve image priority.
- Sticky bottom utility dock with category, hours/hotline, Messenger, Zalo, and account actions.
- No oversized marketing hero cards.

### Product Detail

The product detail page includes:

- Image gallery
- Product badges
- Product title
- Variant selector
- Price and compare-at price
- Unit/weight display
- Quantity selector
- Add-to-cart and buy-now actions
- Trust/service messages
- Description and preparation/storage content
- Related products

### Cart And Checkout

The cart includes:

- Item list
- Empty state
- Order threshold notice
- Recommended products
- Coupon/loyalty placeholders when data exists
- Sticky or prominent checkout summary

The checkout includes:

- Vietnamese-ready customer and address form
- Delivery method selector
- Payment method selector
- Order notes
- Order summary
- Clear payment next-step messaging

## Admin UI Design

### Global Shell

The admin shell includes:

- Left sidebar with module navigation and compact icons.
- Topbar with search, branch/warehouse context, role context, and quick actions.
- Dense page headers with primary action, filters, and status summaries.
- Tables with status chips, row actions, and empty states.
- Restrained colors and cards with radius no larger than 8px.

### Modules

| Module | UI Requirements |
|--------|-----------------|
| Dashboard | Show open orders, low stock, refund queue, complaint queue, purchase orders, sales, and report shortcuts. |
| Products | Show product status, category, price range, stock status, and quick edit links. |
| Orders | Show order status, payment state, fulfillment state, customer, total, and transition action. |
| Inventory | Show warehouse/lot stock, quality status, low-stock indicators, and adjustment entry. |
| Purchase Orders | Show supplier, destination warehouse, PO status, expected date, ordered total, and received total. |
| Refunds | Show refund status, method, order, customer, amount, and processing state. |
| Complaints | Show case reason, status, assigned owner, order/customer links, and resolution state. |
| Content | Manage CMS pages, sections, banners, navigation, footer links, and brand assets. |
| Reports | Present existing report RPCs as compact tables with date filters. |

## Component Boundaries

### Storefront Components

Create or evolve components for:

- `StorefrontHeader`
- `StorefrontFooter`
- `CategorySidebar`
- `CategoryNav`
- `MobileStorefrontDock`
- `HeroMerchandisingGrid`
- `ServiceStrip`
- `PromoBand`
- `ProductRail`
- `ProductCard`
- `FloatingContactActions`
- `ProductDetailView`
- `CartSummary`
- `CheckoutPanel`

### Admin Components

Create or evolve components for:

- `AdminShell`
- `AdminSidebar`
- `AdminTopbar`
- `AdminPageHeader`
- `MetricTile`
- `StatusChip`
- `FilterBar`
- `AdminDataTable`
- `RowActions`
- `EmptyState`
- `DateRangeFilter`

## Styling Rules

- Use Tailwind CSS and existing project conventions.
- Keep colors varied but restrained; avoid a one-note palette.
- Use small dense product and admin cards.
- Use icons from `lucide-react` for actions.
- Keep text within containers at mobile and desktop widths.
- Do not place cards inside cards.
- Do not use decorative gradient orbs or stock-like atmospheric backgrounds.
- Use real or generated seafood images for merchandising placeholders.

## Verification

Each implementation phase must run:

- `pnpm lint`
- `pnpm test`
- Relevant Playwright tests with desktop and mobile screenshots
- Supabase migration smoke checks for new CMS tables and seed content

Acceptance criteria:

- Public storefront follows the reference layout density and commerce patterns without copied assets or prose.
- All visible storefront sections are backed by Supabase or seeded CMS data.
- Admin UI covers the existing operations modules.
- Mobile storefront includes sticky bottom contact/navigation actions.
- Service-role access stays out of client components.
- Existing checkout, order, payment, inventory, and report data paths remain intact.

## Implementation Strategy

Use the phased Supabase-backed build:

1. Add design tokens and shared layout primitives.
2. Add CMS/merchandising migrations and seed content.
3. Build public storefront shell.
4. Build homepage merchandising.
5. Polish category, search, and product detail pages.
6. Polish cart and checkout pages.
7. Build admin shell and dashboard.
8. Build admin modules.
9. Run responsive, accessibility, and screenshot verification.
