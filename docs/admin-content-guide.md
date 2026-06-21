# Admin Content Management Guide

This guide explains how to use the `/admin/content` page to manage all CMS content on the store.

---

## Overview

The content dashboard lets admins create, edit, and delete six types of CMS entities:

| Entity | URL segment | What it controls |
|---|---|---|
| Pages | `/admin/content/pages` | Top-level CMS page records |
| Sections | `/admin/content/sections` | Layout sections within a page |
| Banners | `/admin/content/banners` | Image banners inside a section |
| Navigation items | `/admin/content/navigation` | Header, sidebar, footer, and mobile nav links |
| Footer links | `/admin/content/footer-links` | Grouped links in the site footer |
| Brand assets | `/admin/content/brand-assets` | Partner, payment, trust, and brand logos |

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
| Layout | Optional layout variant string (e.g. `default`, `compact`). |
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
| Group label | Column heading (e.g. `Company`, `Support`, `Legal`). Links with the same group label are rendered together. |
| Label | Link text. |
| Href | Destination path or URL. |
| Sort order | Controls order within the group. |
| Status | Active / Inactive. |

---

## Brand assets

Brand assets are logos used in partner strips, payment method rows, and trust badges.

### Fields

| Field | Notes |
|---|---|
| Asset key | Unique identifier within the placement. |
| Placement | `partner`, `payment`, `trust`, or `brand`. |
| Image URL | Full URL to the logo image. |
| Alt text | Accessible description of the logo. Required. |
| Href | Optional. Wraps the logo in a link. |
| Sort order | Controls order within the placement. |
| Status | Active / Inactive. |

### Placements

| Placement | Where it appears |
|---|---|
| `partner` | Partner brand strip (e.g. supplier logos) |
| `payment` | Accepted payment method icons |
| `trust` | Trust badge row (e.g. security certifications) |
| `brand` | General brand asset area |

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
