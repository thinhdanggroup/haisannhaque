# Dao Hai San Commerce Platform Requirements

## Context

Build a daohaisan.vn-style seafood commerce platform with full storefront and back-office capability. The goal is to reproduce the business functions of a modern Vietnamese seafood retailer: curated product merchandising, local delivery, customer accounts, loyalty, promotions, branch-aware inventory, order operations, refunds, procurement, and admin reporting.

This is not only a visual clone. The first version must support real commerce operations using a lean stack:

- Frontend and backend: Next.js
- Database, authentication, storage, and security: Supabase
- Cache layer: none for v1
- Background workers: none for v1
- CDN: none for v1

The implementation must not copy proprietary images, branding, logos, or text unless the project owner has permission. Use equivalent layouts, flows, and business functionality.

## Goals

- Build a mobile-first seafood e-commerce storefront.
- Support guest and authenticated shopping flows.
- Support product categories, search, product detail pages, cart, checkout, payments, shipping, and order tracking.
- Support customer accounts with order history, saved addresses, wishlist, loyalty tier, and reward points.
- Support promotions, flash sales, coupons, bundles, threshold gifts, and loyalty redemption.
- Support admin management for catalog, content, orders, customers, promotions, inventory, procurement, refunds, and reports.
- Support branch or warehouse inventory instead of a single global stock number.
- Support lot, expiry, and quality status for perishable seafood products.
- Keep v1 operationally simple by using Supabase/PostgreSQL transactions and synchronous API handlers instead of Redis, workers, or external queue infrastructure.

## Non-Goals For V1

- No Redis.
- No background workers, queue consumers, or scheduled worker processes.
- No CDN-specific implementation.
- No marketplace automation beyond manually recorded channel/source fields.
- No native mobile app.
- No multi-language UI unless added later.
- No complex ERP replacement beyond procurement, inventory, and basic reporting.
- No copied daohaisan.vn assets unless explicitly licensed.

## Recommended Stack

| Layer | Requirement |
|---|---|
| Web app | Next.js App Router |
| Styling | Tailwind CSS or the existing project design system |
| Backend | Next.js route handlers and server actions |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage for product images, blog images, and documents |
| Authorization | Supabase Row Level Security plus server-side role checks |
| Search | PostgreSQL full-text search and trigram search |
| Realtime | Supabase Realtime only where useful for admin order/inventory screens |
| Payments | Synchronous gateway initiation and webhook handling through Next.js route handlers |
| Notifications | Synchronous email/SMS/Zalo trigger calls where required |

## Storefront Requirements

### Homepage

The homepage must be merchantable from admin content blocks.

Required sections:

- Hero banners.
- Featured categories.
- Best sellers.
- Flash sale section with countdown.
- Promotional product rows.
- Sashimi, frozen seafood, live seafood, imported seafood, salmon, oyster, shrimp, crab, squid, sauce, and ready-to-eat category sections.
- Gift or combo promotion blocks.
- Store/support entry points.
- Blog or customer feedback highlights.

Business rules:

- Admin users can publish, unpublish, and reorder homepage sections.
- Sections can be scheduled with `starts_at` and `ends_at`.
- Product rows must hide inactive products and unavailable variants.

### Catalog And Categories

The catalog must support category-led browsing.

Required capabilities:

- Hierarchical categories.
- SEO-friendly category slugs.
- Category banners and descriptions.
- Pinned products per category.
- Product listing by category.
- Sort by recommended, newest, price ascending, price descending, best selling, and promotion.
- Filters for price, availability, origin, temperature class, product type, and promotion.

### Search

Use PostgreSQL search for v1.

Required capabilities:

- Search by product name, SKU, category, tags, and short description.
- Basic typo tolerance using PostgreSQL trigram matching.
- Search result ranking by relevance, availability, promotion, and manual boost.
- Empty-search fallback showing popular products.
- Admin-managed search synonyms.

### Product Detail Page

Required content:

- Product name.
- SKU.
- Images.
- Price and sale price.
- Variant choices.
- Unit of measure.
- Origin.
- Temperature class.
- Fresh/frozen/live/ready-to-eat state.
- Stock availability.
- Promotion eligibility.
- Threshold gift eligibility.
- Quantity selector.
- Add to cart.
- Buy now.
- Zalo or hotline order CTA.
- Product description.
- Storage/preparation guidance.
- Related products.

Business rules:

- Product prices come from the active variant.
- Unavailable variants cannot be added to cart.
- Availability must consider branch/warehouse stock and active reservations.
- Product pages must remain visible when out of stock unless admin unpublishes the product.

### Cart

Required capabilities:

- Guest cart.
- Logged-in customer cart.
- Merge guest cart after login.
- Add, update, and remove cart items.
- Show subtotal, discounts, gifts, loyalty redemption, and shipping estimate.
- Validate stock before checkout.
- Persist cart in PostgreSQL.

Business rules:

- Cart prices must be recalculated from current active pricing.
- Cart item product snapshots should be shown for display, but final order uses recalculated price and promotion rules.
- Cart must show unavailable or changed items clearly.

### Checkout

Required capabilities:

- Guest checkout.
- Logged-in checkout.
- Shipping address form.
- Saved address selection for logged-in users.
- Delivery method selection.
- Delivery time slot selection.
- Payment method selection.
- Coupon application.
- Gift selection when eligible.
- Loyalty point redemption when eligible.
- Order note.
- Invoice request fields.
- Order confirmation page.

Payment methods for v1:

- COD.
- Bank transfer.
- MoMo.
- VNPAY.

Shipping rules:

- Support local delivery zones.
- Support branch pickup if enabled.
- Support nationwide shipping method labels for future extension.
- Shipping fee is calculated from province, district, ward, order value, and delivery method.

Business rules:

- Checkout creates stock reservations inside a database transaction.
- Payment gateway redirects or callbacks must be handled synchronously.
- Order creation must be idempotent using an `idempotency_key`.
- If reservation fails, checkout must show the affected SKU and suggested next action.
- If payment fails, the order stays in `awaiting_payment` or becomes `payment_failed` depending on provider response.

### Customer Account

Required pages:

- Login.
- Register.
- Forgot password.
- Profile.
- Address book.
- Order history.
- Order detail.
- Wishlist.
- Loyalty wallet.
- Rewards and available offers.

Business rules:

- Customers can edit profile information.
- Customers can create, update, delete, and set default addresses.
- Customers can view their own orders only.
- Customers can cancel orders only when the order status allows cancellation.

### Wishlist

Required capabilities:

- Add product to wishlist.
- Remove product from wishlist.
- View wishlist in account.
- Add wishlist item to cart if available.

### Loyalty

Required capabilities:

- Loyalty tiers.
- Point accrual.
- Point redemption.
- Manual admin point adjustment.
- Loyalty ledger.
- Customer-visible point balance.

Business rules:

- Points are awarded after order completion, not at order placement.
- Points can be redeemed during checkout if the customer is logged in.
- Every point change must create a ledger entry.
- Admin adjustments require a reason.

### Content

Required content types:

- Blog posts.
- Policy pages.
- Store pages.
- Customer feedback posts.
- Campaign landing pages.
- FAQ entries.

Required policy pages:

- Ordering guide.
- Payment policy.
- Shipping policy.
- Return/refund/complaint policy.
- Privacy policy.
- Terms of service.

## Admin Requirements

### Admin Access

Required roles:

- Super Admin.
- Catalog Manager.
- Marketing.
- Customer Service.
- Store Operations.
- Warehouse.
- Procurement.
- Finance.
- Reporter.

Business rules:

- Admin access requires authentication.
- Admin permissions must be enforced server-side.
- Sensitive actions must write audit logs.
- Row Level Security must prevent unauthorized direct table access.

### Catalog Management

Required capabilities:

- Create, update, archive, and publish products.
- Manage product variants.
- Manage product images.
- Manage categories.
- Manage product-category assignment.
- Manage product tags.
- Manage origin, temperature class, and product attributes.
- Manage related products.
- Manage price and sale price.
- Manage product SEO fields.

### CMS Management

Required capabilities:

- Manage homepage sections.
- Manage banners.
- Manage blog posts.
- Manage policy pages.
- Manage campaign landing pages.
- Manage store locator entries.
- Manage FAQ entries.

### Promotion Management

Required promotion types:

- Coupon code.
- Automatic discount.
- Flash sale.
- Buy X get Y.
- Threshold gift.
- Bundle/combo price.
- Customer group discount.
- Loyalty point redemption.

Required rule fields:

- Start time.
- End time.
- Active flag.
- Customer segment.
- Category scope.
- Product scope.
- Variant scope.
- Minimum order value.
- Maximum uses.
- Maximum uses per customer.
- Stackable flag.
- Priority.

Business rules:

- Promotion calculation must be deterministic.
- Promotion conflicts are resolved by priority and stackable flag.
- Expired promotions are ignored by query conditions, without requiring a worker.
- Promotion results must be snapshotted on the order.

### Order Management

Required capabilities:

- View order list.
- Filter by status, payment status, fulfillment status, source, branch, date, and customer.
- View order detail.
- Edit internal notes.
- Assign branch/warehouse.
- Confirm order.
- Cancel order.
- Mark picking, packed, dispatched, delivered, completed.
- Record payment status.
- Record shipment tracking.
- Create refund.
- Create replacement or return case.

Order statuses:

- `draft_checkout`
- `awaiting_payment`
- `payment_failed`
- `pending_confirmation`
- `confirmed`
- `picking`
- `packed`
- `dispatched`
- `delivery_attempted`
- `delivered`
- `completed`
- `cancelled`
- `returned`
- `partially_returned`
- `refunded`

Business rules:

- Status transitions must be validated.
- Inventory reservations must be released on cancellation.
- Completed orders trigger loyalty accrual.
- Refunds must be tracked separately from payments.

### Inventory Management

Required capabilities:

- Manage branches and warehouses.
- Track stock by variant and branch/warehouse.
- Track lots/batches.
- Track expiry dates.
- Track quality status.
- Track reservations.
- Track stock movements through an immutable ledger.
- Create stock adjustments.
- Create stock transfers.
- Receive stock from purchase orders.
- View low-stock report.

Inventory states:

- On hand.
- Reserved.
- Allocated.
- Picked.
- Packed.
- In transit.
- Quarantined.
- Expired.
- Damaged.

Business rules:

- Do not store one global stock quantity on product.
- Available-to-promise must be computed from stock ledger minus active reservations and unavailable stock.
- Stock ledger entries are append-only.
- Manual adjustments require reason and actor.
- Expiry-managed products should use FEFO picking guidance.

### Procurement

Required capabilities:

- Manage suppliers.
- Create purchase orders.
- Approve purchase orders.
- Receive purchase orders.
- Record received lots.
- Record expiry date and quality status.
- Record discrepancy between ordered and received quantity.
- Create transfer between branches/warehouses.
- View reorder suggestions.

V1 simplification:

- Reorder suggestions can be calculated on page load from current stock, reorder point, and recent sales.
- No background replenishment job is required.

### Refunds And Complaint Handling

Required capabilities:

- Create complaint case.
- Attach evidence images.
- Link complaint to order and order item.
- Record resolution.
- Create refund.
- Issue voucher credit.
- Issue loyalty point compensation.
- Record replacement.

Refund methods:

- Gateway refund.
- Bank transfer.
- Voucher.
- Loyalty points.
- Manual finance action.

Business rules:

- Refunds must have a reason.
- Partial refunds must be supported.
- Refund ledger is separate from payment ledger.
- Returned perishable stock must go to quarantine unless explicitly approved.

### Reporting

Required reports:

- Sales by day.
- Sales by product.
- Sales by category.
- Sales by branch.
- Order status funnel.
- Payment status report.
- Promotion usage.
- Coupon usage.
- Loyalty liability.
- Customer LTV summary.
- Low-stock report.
- Expiring stock report.
- Stock adjustment report.
- Purchase order report.
- Refund report.

V1 simplification:

- Reports can be generated synchronously with SQL views or server-side queries.
- Large exports are not required in v1.

## Data Model Requirements

### Core Tables

Minimum required tables:

- `profiles`
- `admin_roles`
- `admin_permissions`
- `customers`
- `addresses`
- `categories`
- `products`
- `product_variants`
- `product_images`
- `product_categories`
- `product_tags`
- `collections`
- `carts`
- `cart_items`
- `wishlists`
- `wishlist_items`
- `orders`
- `order_items`
- `payments`
- `refunds`
- `shipments`
- `promotions`
- `promotion_rules`
- `promotion_redemptions`
- `loyalty_tiers`
- `loyalty_ledger`
- `warehouses`
- `inventory_items`
- `lots`
- `stock_ledger_entries`
- `stock_reservations`
- `stock_adjustments`
- `stock_transfers`
- `suppliers`
- `purchase_orders`
- `purchase_order_lines`
- `goods_receipts`
- `content_pages`
- `blog_posts`
- `homepage_sections`
- `store_locations`
- `complaint_cases`
- `audit_logs`

### Important Field Requirements

Product:

- `id` UUID primary key.
- `slug` Text unique.
- `name` Text required.
- `short_description` Text nullable.
- `description` Text nullable.
- `origin` Text nullable.
- `temperature_class` Text required.
- `status` Text required.
- `seo_title` Text nullable.
- `seo_description` Text nullable.

ProductVariant:

- `id` UUID primary key.
- `product_id` UUID foreign key.
- `sku` Text unique required.
- `barcode` Text nullable.
- `unit` Text required.
- `option_summary` Text nullable.
- `list_price` Numeric required.
- `sale_price` Numeric nullable.
- `is_active` Boolean default true.
- `is_weighable` Boolean default false.

Order:

- `id` UUID primary key.
- `order_no` Text unique required.
- `customer_id` UUID nullable.
- `source_channel` Text required.
- `order_status` Text required.
- `payment_status` Text required.
- `fulfillment_status` Text required.
- `subtotal` Numeric required.
- `discount_total` Numeric required.
- `shipping_total` Numeric required.
- `grand_total` Numeric required.
- `idempotency_key` Text unique required.
- `placed_at` Timestamp nullable.

StockLedgerEntry:

- `id` UUID primary key.
- `variant_id` UUID foreign key.
- `warehouse_id` UUID foreign key.
- `lot_id` UUID nullable foreign key.
- `movement_type` Text required.
- `quantity_delta` Numeric required.
- `source_doc_type` Text required.
- `source_doc_id` UUID nullable.
- `actor_id` UUID nullable.
- `created_at` Timestamp required.

StockReservation:

- `id` UUID primary key.
- `order_id` UUID nullable foreign key.
- `cart_id` UUID nullable foreign key.
- `variant_id` UUID foreign key.
- `warehouse_id` UUID foreign key.
- `lot_id` UUID nullable foreign key.
- `quantity` Numeric required.
- `status` Text required.
- `expires_at` Timestamp required.

## Supabase Requirements

### Authentication

- Use Supabase Auth for customer and admin login.
- Store public user profile data in `profiles`.
- Store customer-specific commerce data in `customers`.
- Admin role assignment must be explicit and server-validated.

### Row Level Security

Enable RLS for all customer, admin, and business tables.

Customer access rules:

- Customers can read and update their own profile.
- Customers can read and manage their own addresses.
- Customers can read their own orders.
- Customers can manage their own wishlist.
- Customers can manage their own cart.

Admin access rules:

- Admin users can access admin data only when assigned a valid role.
- Role permissions must be checked in server-side functions or route handlers.
- Super Admin can manage roles and permissions.

Public access rules:

- Public users can read active categories.
- Public users can read published products.
- Public users can read published content pages and blog posts.
- Public users cannot read internal inventory, orders, customers, or admin data.

### Database Functions

Required PostgreSQL functions:

- `calculate_available_stock(variant_id, warehouse_id)`.
- `reserve_stock(cart_id, order_id, variant_id, warehouse_id, quantity)`.
- `release_expired_reservations()`.
- `calculate_cart_totals(cart_id)`.
- `apply_promotions(cart_id)`.
- `create_order_from_checkout(checkout_payload, idempotency_key)`.
- `transition_order_status(order_id, next_status, actor_id)`.
- `award_loyalty_points(order_id)`.

V1 note:

- `release_expired_reservations()` can be called opportunistically from cart, checkout, and admin inventory flows. It does not require a background worker.

### Storage

Required buckets:

- `product-images`.
- `content-images`.
- `complaint-evidence`.
- `documents`.

Storage rules:

- Public product and content images can be readable.
- Complaint evidence must be private.
- Admin uploads must validate file type and size.

## API Requirements

Use Next.js route handlers for external callbacks and operational APIs. Use server actions for internal form submissions where appropriate.

Required public/customer endpoints:

- `GET /api/products`
- `GET /api/products/[slug]`
- `GET /api/categories/[slug]`
- `GET /api/search`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/[id]`
- `DELETE /api/cart/items/[id]`
- `POST /api/checkout`
- `POST /api/orders`
- `GET /api/orders/[orderNo]`
- `POST /api/payments/intents`
- `POST /api/shipments/quotes`

Required webhook endpoints:

- `POST /api/webhooks/payments/momo`
- `POST /api/webhooks/payments/vnpay`
- `POST /api/webhooks/shipping`

Required admin endpoints:

- `GET /api/admin/orders`
- `PATCH /api/admin/orders/[id]`
- `POST /api/admin/orders/[id]/transition`
- `POST /api/admin/orders/[id]/refunds`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/[id]`
- `GET /api/admin/inventory`
- `POST /api/admin/inventory/adjustments`
- `POST /api/admin/purchase-orders`
- `POST /api/admin/goods-receipts`
- `GET /api/admin/reports/[reportName]`

## Integration Requirements

### Payment

Required payment integrations:

- COD internal status handling.
- Bank transfer manual confirmation.
- MoMo payment intent and webhook.
- VNPAY payment intent and webhook.

Rules:

- Webhook signatures must be verified.
- Duplicate webhooks must be ignored safely.
- Payment updates must be idempotent.
- Payment status changes must write audit logs.

### Shipping

V1 can start with internal delivery method configuration.

Required capabilities:

- Calculate shipping fee by address and delivery method.
- Store carrier name, tracking number, fee, and status.
- Allow manual status updates by admin.
- Leave API integration structure ready for GHN, GHTK, Ahamove, or GrabExpress.

### Notifications

Required notifications:

- Order placed.
- Payment received.
- Order confirmed.
- Order dispatched.
- Order delivered.
- Order cancelled.
- Refund processed.

V1 simplification:

- Notifications are sent synchronously from the relevant API route or server action.
- If a notification provider fails, the main order transaction should not be rolled back after successful order creation. Record the failure in `audit_logs` or a notification log table.

### Analytics

Required events:

- View product.
- Search.
- Add to cart.
- Begin checkout.
- Apply coupon.
- Purchase.
- Refund.
- Login.
- Signup.

V1 implementation:

- Use client-side analytics tags and server-side order event recording in PostgreSQL.

## Key Workflows

### Add To Cart

1. Customer selects a product variant.
2. System validates product and variant status.
3. System checks current available stock.
4. System creates or updates cart item.
5. System recalculates cart totals and promotion preview.
6. Customer sees updated cart.

### Checkout And Order Creation

1. Customer submits checkout form.
2. System validates address, delivery method, payment method, cart items, and promotion rules.
3. System calls `release_expired_reservations()` opportunistically.
4. System creates stock reservations in a PostgreSQL transaction.
5. System creates order and order item snapshots.
6. System creates payment intent when payment method requires online payment.
7. System returns redirect URL or order confirmation.
8. Payment webhook updates payment and order status.

### Order Fulfillment

1. Admin confirms order.
2. Admin assigns branch or warehouse.
3. Warehouse marks order as picking.
4. Warehouse marks order as packed.
5. Store operations marks order as dispatched.
6. Admin or shipping webhook marks order as delivered.
7. System marks order completed when service window closes or admin confirms completion.
8. System awards loyalty points.

### Cancellation

1. Customer or admin requests cancellation.
2. System validates current order status.
3. System releases active reservations.
4. System updates order status.
5. System creates refund record if payment was captured.
6. System sends cancellation notification.

### Purchase Order Receiving

1. Procurement creates purchase order.
2. Authorized admin approves purchase order.
3. Warehouse receives goods.
4. System records received quantity, lot number, expiry date, and quality status.
5. System writes stock ledger entries.
6. Inventory availability updates immediately.

## UI Requirements

### Storefront UI

- Mobile-first layout.
- Sticky add-to-cart on product detail page.
- Compact cart and checkout flow.
- Clear price and promotion display.
- Clear out-of-stock state.
- Clear support CTAs.
- Vietnamese content by default.
- SEO-friendly pages.
- Accessible forms, buttons, and navigation.

### Admin UI

- Dense operational dashboard.
- Tables with filtering, sorting, pagination, and status chips.
- Detail pages for products, orders, customers, inventory items, purchase orders, and complaints.
- Role-aware navigation.
- Clear audit trail for sensitive objects.
- Forms must validate required fields before submission.

## Non-Functional Requirements

### Performance

- Homepage should load quickly without relying on CDN-specific behavior.
- Product listing page should support pagination.
- Search should return within acceptable time for v1 catalog size.
- Checkout server actions should avoid unnecessary network calls inside database transactions.

### Reliability

- Order creation must be idempotent.
- Payment webhooks must be idempotent.
- Inventory reservation must be transactional.
- Stock ledger must be append-only.
- Admin status transitions must be validated.

### Security

- Enable RLS on Supabase tables.
- Use server-side Supabase service role only in protected server code.
- Never expose service role keys to the browser.
- Verify payment webhook signatures.
- Validate all user input.
- Audit sensitive admin operations.
- Keep customer personal data access limited by role.

### SEO

- Product pages need title, description, canonical URL, and structured data.
- Category pages need metadata and clean slugs.
- Content pages need metadata.
- Generate sitemap routes.
- Exclude cart, checkout, account, and admin pages from indexing.

### Accessibility

- Use semantic HTML.
- Forms must have labels.
- Buttons must have accessible names.
- Keyboard navigation must work for menus, dialogs, and checkout.
- Color contrast must be readable.

## Suggested Milestones

### Milestone 1: Foundation

- Next.js app structure.
- Supabase project setup.
- Auth setup.
- Database schema.
- RLS policies.
- Admin shell.
- Storefront shell.

### Milestone 2: Catalog And CMS

- Categories.
- Products.
- Variants.
- Images.
- Product listing.
- Product detail page.
- Homepage content blocks.
- Blog and policy pages.

### Milestone 3: Cart, Checkout, And Orders

- Cart.
- Checkout.
- Address book.
- Order creation.
- Payment methods.
- Payment webhooks.
- Order confirmation.
- Customer order history.

### Milestone 4: Promotions And Loyalty

- Coupons.
- Automatic discounts.
- Flash sales.
- Threshold gifts.
- Loyalty tiers.
- Loyalty ledger.
- Point redemption.

### Milestone 5: Inventory And Fulfillment

- Warehouses and branches.
- Stock ledger.
- Reservations.
- Lots and expiry.
- Order fulfillment statuses.
- Stock adjustments.
- Stock transfers.

### Milestone 6: Procurement, Refunds, And Reports

- Suppliers.
- Purchase orders.
- Goods receiving.
- Complaint cases.
- Refunds.
- Admin reports.
- Audit logs.

### Milestone 7: Hardening

- End-to-end tests.
- Permission tests.
- Payment webhook tests.
- Inventory transaction tests.
- SEO validation.
- Accessibility pass.
- UAT fixes.

## Acceptance Criteria

- A customer can browse products, search, add to cart, checkout, pay or choose COD, and view order history.
- An admin can manage products, categories, content, promotions, orders, customers, inventory, suppliers, purchase orders, refunds, and reports.
- Stock availability is branch/warehouse-aware.
- Checkout prevents overselling through transactional reservations.
- Promotions and loyalty are applied consistently and snapshotted on orders.
- Payment webhooks are verified and idempotent.
- RLS prevents customers from accessing other customers' data.
- Admin actions are permission checked and audited.
- The system runs without Redis, background workers, or CDN-specific dependencies in v1.
