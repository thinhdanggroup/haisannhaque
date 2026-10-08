# Admin Content Management Guide

This guide explains how to use the `/admin/content` page to manage all CMS content on the store.

---

## Overview

The content dashboard lets admins create, edit, and delete these CMS entities (support pages have their own admin menu item):

| Entity | URL segment | What it controls |
|---|---|---|
| Pages | `/admin/content/pages` | Top-level CMS page records |
| Sections | `/admin/content/sections` | Layout sections within a page |
| Banners | `/admin/content/banners` | Image banners inside a section |
| Navigation items | `/admin/content/navigation` | Header, sidebar, footer, and mobile nav links |
| Footer links | `/admin/content/footer-links` | Grouped links in the site footer |
| Brand assets | `/admin/content/brand-assets` | Bank-transfer QR, order-app logos, partner/payment/trust/brand logos |
| Support pages | `/admin/support-pages` | "Hỗ trợ khách hàng" pages at `/ho-tro/<slug>` (separate admin menu item) |

All mutations require the `cms:update` admin permission.

---

## Pages

Pages are the top-level containers. Sections live inside pages.

### Fields

| Field | Notes |
|---|---|
| Page key | Lowercase letters, digits, hyphens. Must be unique. Cannot be changed after creation. |
| Title | Display name shown in admin lists. |
| Status | `draft` — hidden from storefront. `published` — live. `archived` — hidden, kept for history. |

### Workflow

1. Go to `/admin/content` and click **New page** in the Pages table.
2. Fill in a page key (e.g. `home`, `about-us`) and title.
3. Set status to `draft` while building out sections.
4. Change to `published` when ready to go live.

---

## Sections

Sections define the layout zones within a page. Each section has a type that tells the storefront which component to render.

### Fields

| Field | Notes |
|---|---|
| Page | The parent page (selected on create; cannot change after). |
| Section key | Unique identifier within the page. Lowercase, hyphens only. |
| Section type | Controls the rendered component. See types below. |
| Title / Subtitle | Optional display text passed to the component. |
| Layout | Optional layout variant. For `product_rail` / `flash_sale`: `default` renders a grid, `carousel` a horizontally scrolling row (arrows on desktop, swipe on mobile). |
| Sort order | Lower numbers appear first. |
| Status | Active / Inactive. |

### Section types

| Type | Renders |
|---|---|
| `hero` | Full-width hero banner |
| `service_strip` | Icon + label service highlights |
| `category_shortcuts` | Category icon grid |
| `product_rail` | Horizontal product carousel |
| `flash_sale` | Countdown + product grid |
| `promo_band` | Thin promotional message bar |
| `recommendation_tabs` | Tabbed product recommendations |
| `partner_strip` | Partner logo strip |
| `content_highlights` | Editorial card grid |
| `footer` | Footer layout zone |

### Recommendation tabs ("Gợi ý cho bạn")

A `recommendation_tabs` section renders a row of tabs on the homepage. Each tab has its own product list, and clicking a tab swaps the product grid to that list.

Manage tabs at `/admin/content/sections/[id]/tabs` — click **Tab & sản phẩm** on the section's row in the content list, or the link on its edit page.

| Field | Notes |
|---|---|
| Tab name | Shown on the storefront. Required, max 60 characters. |
| Key | Unique within the section. Lowercase, digits, hyphens. Pre-filled for new tabs. |
| Link | Optional. Must start with `/` or `#`. When set, the tab opens that page instead of switching products. |
| Products | Search published products by name and add them. Up to 40 per tab; reorder with ↑/↓, remove with ✕. |

Tabs are ordered with ↑/↓; the first tab is selected when the page loads. Nothing is saved until you click **Lưu tab**, which updates the homepage immediately.

A tab with no products shows every product in the section. The section still needs Status = Active to appear, and its title, subtitle, and sort order are edited on the regular section edit page.

Under the hood, tabs are stored in `cms_sections.metadata.tabs` (`{ key, label, href?, productIds }`), and `cms_section_products` holds the union of all tab products so the homepage loads every card in one query.

### Product rail products ("Bán chạy" and other product rails)

`product_rail` and `flash_sale` sections show a hand-picked product list. Manage it at `/admin/content/sections/[id]/products`: click **Sản phẩm** on the section's row in the content list, or *Chọn sản phẩm hiển thị* on its edit page.

Search published products by name, add up to 40, reorder with ↑/↓, remove with ✕, then click **Lưu sản phẩm**. The homepage updates immediately. Saving keeps the badge text of products that stay in the list.

A product only renders if it has at least one active variant. The homepage "Bán chạy" section (`best-sellers`) uses Layout `carousel` and Sort order `5`, which places it between the `hero-main` (0) and `hero` (10) sections.

---

## Banners

Banners are image assets attached to a section. A section can have multiple banners (e.g. a carousel).

### Fields

| Field | Notes |
|---|---|
| Section | The parent section (dropdown shows `pageKey / sectionKey`). |
| Title | Required. Used as accessible alt text fallback. |
| Subtitle | Optional secondary text. |
| Image URL | Full URL to the desktop image. Must be a valid URL. |
| Mobile image URL | Optional. Falls back to Image URL if omitted. |
| CTA label | Optional. Text for the call-to-action button. |
| CTA href | Optional. Destination URL for the CTA. |
| Sort order | Controls order within the section. |
| Status | Active / Inactive. |

---

## Navigation items

Navigation items populate the site's nav placements.

### Fields

| Field | Notes |
|---|---|
| Placement | `header`, `sidebar`, `mobile_dock`, or `footer`. |
| Label | Link text shown to the user. |
| Href | Destination path or URL (e.g. `/products`, `/sale`). |
| Icon key | Optional. Key referencing the icon registry used by the storefront. |
| Sort order | Controls order within the placement. |
| Status | Active / Inactive. |

### Placements

| Placement | Where it appears |
|---|---|
| `header` | Top navigation bar |
| `sidebar` | Left-side category navigation |
| `mobile_dock` | Bottom navigation bar on mobile |
| `footer` | Footer navigation column |

> Duplicate `(placement, label, href)` combinations are rejected with a user-friendly error.

---

## Footer links

Footer links are grouped sets of links rendered at the bottom of the page.

### Fields

| Field | Notes |
|---|---|
| Group label | Column heading (e.g. `Company`, `Support`, `Legal`). Links with the same group label are rendered together. Links in the `Hỗ trợ khách hàng` group are managed by support pages; edit the page, not the link. |
| Label | Link text. |
| Href | Destination path or URL. |
| Sort order | Controls order within the group. |
| Status | Active / Inactive. |

---

## Brand assets

Brand assets are images shown in the footer and checkout: the bank-transfer QR, order-app logos, and partner, payment and trust logos. On the content dashboard the table is titled **Hình ảnh: tài khoản ngân hàng, app đặt hàng, logo**.

### Fields

| Field | Notes |
|---|---|
| Asset key | Unique identifier within the placement. |
| Placement | See placements below. Field labels change with the placement to hint what to enter. |
| Image | Click **Tải ảnh lên** to upload (JPEG/PNG/WEBP/GIF, max 5 MB, stored in the `media` bucket), or paste an `https://` URL. |
| Alt text | For `bank_account`: the account details, written as `Bank - Number - Holder` (split on ` - ` into lines). For `order_app`: the display name. Otherwise an accessible description. Required. |
| Href | Optional. Wraps the image in a link; external links open in a new tab. Leave empty for `bank_account`. |
| Sort order | Controls order within the placement. |
| Status | Active / Inactive. |

### Placements

| Placement | Where it appears |
|---|---|
| `bank_account` | Checkout (when "Chuyển khoản ngân hàng" is selected), the order confirmation page (with the order number as transfer note), and the footer |
| `order_app` | "Đặt hàng qua app" in the footer and at the bottom of the checkout payment panel |
| `partner` | Footer "Đối tác" group |
| `payment` | Footer "Thanh toán" group (accepted payment method icons) |
| `trust` | Footer "Cam kết" group |
| `brand` | General brand asset area |

Assets whose image URL is a `placehold.co` placeholder render their alt text instead of the image.

---

## Support pages ("Hỗ trợ khách hàng")

Managed at `/admin/support-pages` (its own item in the admin sidebar). Each page is served at `/ho-tro/<slug>` and owns a footer link in the `Hỗ trợ khách hàng` group: creating, renaming, reordering, hiding or deleting a page updates that link automatically.

| Field | Notes |
|---|---|
| Title | Page heading and footer link text. |
| Slug | Lowercase, digits, hyphens. Derived from the title (diacritics removed) for new pages; editable. Changing it moves the footer link. |
| Body | Plain text with light markup: `## heading`, `- bullet`, `1. step`, `**bold**`, blank line = new paragraph, bare `https://` URLs become links. A live preview sits beside the editor. No HTML. |
| Sort order | Order within the footer group. |
| Status | Published (page reachable, link shown) / Draft (page 404s, link hidden). |

Stored in `cms_support_pages`; anonymous readers can only read published rows (RLS).

---

## Common operations

### Deactivating without deleting

Set **Status** to **Inactive** on any entity. The storefront hides inactive records without removing them from the database.

### Controlling display order

Every entity has a **Sort order** field. Lower numbers appear first. Items with the same sort order fall back to database insertion order.

### Deleting a record

Click the **Delete** button in the entity's row on the `/admin/content` dashboard. A browser confirmation prompt appears before the delete is sent. Deletion is permanent.

> Deleting a section cascades to its banners. Deleting a navigation item cascades to any child items that reference it as a parent.

---

## Permissions

The `cms:update` permission is required for all create, edit, and delete operations. Users without it see a "You do not have access" message on the form pages. Read-only access to the dashboard is controlled separately.

To grant or revoke the permission, update the user's role in the `user_admin_roles` table via the Supabase dashboard or a migration.
