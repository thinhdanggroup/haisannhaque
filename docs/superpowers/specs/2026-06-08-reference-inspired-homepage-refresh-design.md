# Reference-Inspired Homepage Refresh Design

## Goal

Refresh the full public homepage so it feels like the provided daohaisan.vn reference PDF while keeping Dao Seafood branding, original or generated placeholder imagery, and the existing CMS-driven Next.js/Supabase architecture.

## Reference

Primary visual reference:

- `docs/references/daohaisan-vn.pdf`

The reference is used for layout rhythm, density, color energy, and merchandising behavior. It is not a source for copied logos, images, product text, or proprietary brand assets.

## Approved Direction

The homepage should be reference-inspired, not pixel-perfect. The implementation should preserve the current `Dao Seafood` identity and keep `app/(storefront)/page.tsx` driven by `CmsSection`.

The scope covers the entire homepage down to the footer:

- Header and category navigation
- Desktop category sidebar
- First-viewport hero merchandising area
- Category shortcuts
- Service/trust strip where useful
- Promo campaign bands
- Product rails and flash-sale rail
- Recommendation tabs
- Policy, news, and useful-info content highlights
- Partner, payment, social, and trust logo areas
- Full footer with company information band

Use new generated or placeholder seafood, campaign, product, news, partner, payment, and trust imagery for demo data. Do not copy daohaisan.vn assets or prose.

## Architecture

Keep the homepage as a CMS section dispatcher:

- `app/(storefront)/page.tsx` loads `StorefrontChrome` and `HomePageContent`.
- `renderHomeSection(section: CmsSection)` maps each section type to a storefront component.
- Existing CMS queries remain the content source for production data.
- Playwright fixtures provide deterministic test content when the test environment requests fixtures.
- Seed data remains the source for local demo content.

Section rendering should support:

| Section type | Component behavior |
|--------------|--------------------|
| `hero` | Refreshed `HeroMerchandisingGrid` with one large image-led banner, stacked side banners, and compact campaign messaging. |
| `service_strip` | Compact trust/service row with icons, not an oversized marketing block. |
| `category_shortcuts` | Dense category shortcut grid matching the reference's quick-scan category feel. |
| `promo_band` | Full-width image-led campaign band between product rails. |
| `product_rail` | Dense product shelf with section title, optional subtitle, `Xem thêm`, and compact product grid. |
| `flash_sale` | Product shelf variant with sale badge and countdown metadata. |
| `recommendation_tabs` | New tabbed recommendation shelf driven from section metadata and products. |
| `content_highlights` | New near-footer policy/news/useful-info block. |
| `partner_strip` | New partner/payment/social/trust logo strip before or within footer territory. |

No database migration is required unless implementation finds that existing CMS metadata cannot express the approved layout.

## Desktop Layout

The desktop homepage should use a bright, dense Vietnamese seafood-commerce layout:

1. Header stack:
   - Thin campaign/service bar at the top.
   - Main logo/search/hotline/account/cart row.
   - Cyan and orange category/navigation row.
2. Main content:
   - `max-w-7xl` centered layout.
   - Left category sidebar visible on large screens.
   - Main merchandising column to the right.
3. First viewport:
   - Compact category sidebar.
   - Hero collage with one dominant banner, side banners, and a slim campaign band.
   - Image priority should be high; text overlays must not obscure core product imagery.
4. Body rhythm:
   - Section title, optional subtitle, and right-aligned `Xem thêm`.
   - Dense 5-column desktop product grids.
   - Periodic full-width campaign banners between product shelves.
5. Near footer:
   - Customer thank-you, policy, useful-info, and news/content highlight areas.
   - Partner logos, payment methods, social icons, and trust badges.
   - Gray company-information band with addresses/contact/legal-style details.

The page should feel busy enough to scan deals quickly, but individual text and controls must remain readable.

## Mobile Layout

The mobile homepage should keep the same merchandising order while simplifying the layout:

- Header compresses to logo/actions/search without text overlap.
- Category navigation becomes horizontal or dock-oriented.
- Desktop category sidebar remains hidden.
- Hero banners stack or compress into a single-column layout.
- Product grids use 2 columns.
- Product card labels and prices stay readable at 320px width and above.
- Mobile bottom dock remains available for core actions.
- Footer groups stack cleanly with the company information band below.

## Visual System

Use a brighter storefront palette than the current muted homepage:

- Cyan and sky blue for header, category surfaces, and campaign energy.
- Orange for primary actions, cart/options buttons, and selected sale accents.
- Red for sale prices and discount badges.
- White product surfaces with fine borders.
- Light gray page background and footer company-information band.

Avoid a one-note palette. The page should not become only teal, only blue, or only orange.

Cards and fixed-format UI should use stable dimensions so hover states, labels, badges, and product metadata do not shift layout. Product cards should be compact and image-led:

- Square product image area.
- Discount/status ribbons where data exists.
- Product name clamped to two lines.
- Unit label.
- Red current price.
- Compare-at price when present.
- Sold label when present.
- Orange add/options button.

## Content And Data

Update both deterministic fixtures and local seed content:

- `src/features/cms/playwright-fixtures.ts`
- `supabase/seed.sql`

Fixture and seed data should include enough content to render the entire requested homepage:

- Hero collage banners
- Category shortcut metadata
- Best-seller rail
- Flash-sale rail with countdown metadata
- Value or budget promo band
- Recommendation tabs
- Sushi and sashimi rail
- Frozen seafood rail
- Shellfish rail
- Crab/lobster rail
- Ready-to-eat rail
- Content highlights for policies/news/useful info
- Partner, payment, social, and trust visual placeholders
- Footer link groups and company details

Generated or placeholder images should be visually descriptive enough to make screenshots meaningful. Placeholder URLs are acceptable, but they should use seafood/campaign text and varied colors so the page does not look empty.

## Component Boundaries

Refresh existing components:

- `components/storefront/storefront-header.tsx`
- `components/storefront/category-nav.tsx`
- `components/storefront/category-sidebar.tsx`
- `components/storefront/category-shortcut-strip.tsx`
- `components/storefront/hero-merchandising-grid.tsx`
- `components/storefront/service-strip.tsx`
- `components/storefront/promo-band.tsx`
- `components/storefront/product-rail.tsx`
- `components/storefront/product-grid.tsx`
- `components/storefront/product-card.tsx`
- `components/storefront/storefront-footer.tsx`

Add new storefront components:

- `components/storefront/recommendation-tabs.tsx`
- `components/storefront/content-highlights.tsx`
- `components/storefront/partner-strip.tsx`

Metadata parsing should use typed runtime guards like the existing `CategoryShortcutStrip` approach. Keep component helpers small and local unless multiple components need the same parsing logic.

## Testing

Update the homepage E2E coverage in `tests/e2e/storefront-checkout.spec.ts`:

- Assert the reference-inspired homepage renders at 390px and 1440px.
- Keep screenshot capture for mobile and desktop.
- Assert the desktop category sidebar is visible at large viewport widths.
- Assert at least 24 product cards render.
- Assert the new full-homepage sections render, including recommendations, content highlights, partner/payment/trust areas, and footer company information.

Run these verification commands after implementation:

```bash
pnpm lint
pnpm test
pnpm exec playwright test
```

## Risks And Constraints

- The reference PDF is image-based, so visual requirements come from screenshot inspection, not text extraction.
- Existing CMS section types already include the needed section names, so avoid schema changes unless the implementation discovers a concrete blocker.
- The homepage should remain Vietnamese-ready. User-visible storefront copy should stay Vietnamese where the current app already uses Vietnamese.
- Do not expose service-role Supabase keys in client components.
- Do not introduce background workers, queues, Redis, or CDN-specific behavior.
- Do not copy proprietary daohaisan.vn assets, logo, branding, or exact text.

## Success Criteria

The refresh is successful when:

- The first viewport clearly resembles a dense seafood commerce storefront with bright header, category sidebar, hero collage, and campaign surfaces.
- The body follows the reference rhythm of product shelf, promo banner, product shelf.
- The page includes below-fold recommendation, content/news/policy, partner/payment/trust, and full footer areas.
- The homepage remains CMS-driven and maintainable.
- Mobile remains usable with no overlapping text, buttons, badges, or images.
- Lint, unit tests, and Playwright tests pass.
