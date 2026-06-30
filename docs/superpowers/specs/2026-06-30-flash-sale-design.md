# Flash Sale Events — Design Spec

**Date:** 2026-06-30  
**Status:** Approved  
**Goal:** Drive more sales via time-boxed discount events with live countdown timers.

---

## Overview

Admins create flash sale events with a name, discount percentage, start/end time, and a list of participating products. The storefront automatically detects the active event and shows discounted prices + a live countdown timer on product cards, the product detail page, and the homepage flash-sale section. When the event ends the storefront reverts to regular pricing with no manual action required.

---

## Database

### `flash_sale_events`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `name` | `text NOT NULL` | display name, e.g. "Cuối tuần giảm 20%" |
| `discount_pct` | `integer NOT NULL` | 1–99 |
| `start_at` | `timestamptz NOT NULL` | UTC |
| `end_at` | `timestamptz NOT NULL` | UTC, must be > start_at |
| `is_active` | `boolean NOT NULL DEFAULT true` | manual kill-switch |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

Constraint: `discount_pct BETWEEN 1 AND 99`, `end_at > start_at`.

### `flash_sale_event_products`

| Column | Type | Notes |
|---|---|---|
| `event_id` | `uuid FK → flash_sale_events.id ON DELETE CASCADE` | |
| `product_id` | `uuid FK → products.id ON DELETE CASCADE` | |
| PK | `(event_id, product_id)` | |

### View: `active_flash_sale_v`

```sql
CREATE OR REPLACE VIEW active_flash_sale_v AS
SELECT *
FROM flash_sale_events
WHERE is_active = true
  AND start_at <= now()
  AND end_at > now()
ORDER BY end_at ASC
LIMIT 1;
```

Returns at most one row — the soonest-ending active event. Deterministic when events overlap.

### RLS

- `flash_sale_events` and `flash_sale_event_products`: anon/authenticated can SELECT; only admin role can INSERT/UPDATE/DELETE (via `user_admin_roles` check, same pattern as other tables).
- `active_flash_sale_v`: public SELECT (anon).

### Migration

New file: `supabase/migrations/YYYYMMDDNNNN_flash_sale_events.sql`  
Append-only, no destructive changes to existing tables.

---

## Feature Module

Path: `src/features/flash-sales/`

| File | Purpose |
|---|---|
| `types.ts` | `FlashSaleEvent`, `FlashSaleEventProduct`, `ActiveFlashSale` — pure TS types |
| `schema.ts` | Zod schemas for create/edit form validation |
| `queries.ts` | `getActiveFlashSale(client)`, `getFlashSaleEvents(client)`, `getFlashSaleEvent(client, id)` |
| `admin-actions.ts` | `createFlashSaleEvent`, `updateFlashSaleEvent`, `deleteFlashSaleEvent` — `"use server"`, guarded by `requireAdminPermission(client, "flash_sales:manage")` |

Permission key `"flash_sales:manage"` added to `src/features/admin/permissions.ts`.

---

## Admin UI

### Routes

| Path | Description |
|---|---|
| `/admin/flash-sales` | List all events |
| `/admin/flash-sales/new` | Create event form |
| `/admin/flash-sales/[id]/edit` | Edit event form |

### List page

Table columns: Name, Discount %, Start, End, Status badge (Scheduled / Live / Ended), Actions (Edit, Delete).  
Status is computed client-side from `start_at`, `end_at`, `is_active`.

### New / Edit form

Fields:
- Event name (text, required)
- Discount % (integer 1–99, required)
- Start datetime (datetime-local, required)
- End datetime (datetime-local, required, > start)
- Active toggle (boolean, default on)
- Product selector: searchable list of products with checkboxes; shows current selections at top.

Validation via Zod schema before server action. Server action re-validates. Redirect to list on success; `revalidatePath("/admin/flash-sales")` before redirect.

---

## Storefront

### Active event data flow

`getActiveFlashSale(client)` is called in:
1. `app/(storefront)/page.tsx` — passed to sections that render product cards.
2. `app/(storefront)/products/[slug]/page.tsx` — passed to `ProductDetailView`.
3. `app/(storefront)/categories/[slug]/page.tsx` — passed to `ProductGrid`.

The query joins `active_flash_sale_v` with `flash_sale_event_products` and returns:

```ts
type ActiveFlashSale = {
  id: string;
  name: string;
  discountPct: number;
  endAt: string; // ISO 8601
  productIds: Set<string>;
};
```

### Price computation

Done **server-side** in `queries.ts`. Never passed from the client.

```ts
function applyFlashSalePrice(listPrice: number, discountPct: number): number {
  return Math.round(listPrice * (1 - discountPct / 100));
}
```

Product cards and detail views receive a `flashSalePrice?: number` prop alongside `listPrice`.

### Countdown timer

New client component: `components/storefront/flash-sale-countdown.tsx`

```
Props: { endAt: string; label?: string }
```

Uses `useEffect` + `setInterval(1000)` to compute `HH:MM:SS` from `Date.now()` vs `new Date(endAt)`. When the countdown reaches zero it renders "Đã kết thúc" and stops the interval. No server polling.

### Product card changes (`components/storefront/product-card.tsx`)

When `flashSalePrice` is present:
- Red badge overlaid on image: `🔥 -${discountPct}% | HH:MM:SS`
- Price line shows `flashSalePrice` in red + `listPrice` struck through.

### Product detail page changes

A full-width countdown bar below the product title showing:
- Discounted price (large, red)
- Original price struck through
- `<FlashSaleCountdown endAt={endAt} />`
- Event name label

### Homepage flash_sale CMS section

The existing `ProductRail` component rendered for `flash_sale` section type receives `activeFlashSale` as a prop and passes it down to each `ProductCard`. No new section type needed.

---

## Error handling & edge cases

| Scenario | Behaviour |
|---|---|
| Countdown hits zero mid-session | Timer renders "Đã kết thúc"; next navigation fetches fresh data (no flash sale active) |
| Two events overlap | `active_flash_sale_v` returns earliest `end_at` — deterministic |
| Admin kills event via `is_active = false` | Takes effect on next request; no cache invalidation needed (`force-dynamic`) |
| Product removed from event mid-session | Price reverts on next navigation |
| No active event | `getActiveFlashSale` returns `null`; all flash-sale UI hidden |

---

## Testing

- Unit tests in `src/features/flash-sales/` covering `applyFlashSalePrice` edge cases (0%, 100%, rounding).
- Zod schema tests for create/edit validation (missing fields, discount out of range, end before start).
- E2E smoke test: create event in admin → navigate to product page → assert discounted price and countdown visible.

---

## Out of scope

- Email/push notifications when a flash sale starts.
- Per-variant flash sale pricing (all variants of a product get the same discount).
- Flash sale scheduling queue (admin sets times manually).
- Stacking with loyalty point discounts (flash sale price is the checkout price; points are awarded on the flash sale price).
