create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create type product_status as enum ('draft', 'published', 'archived');
create type order_status as enum (
  'draft_checkout',
  'awaiting_payment',
  'payment_failed',
  'pending_confirmation',
  'confirmed',
  'picking',
  'packed',
  'dispatched',
  'delivery_attempted',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'partially_returned',
  'refunded'
);
create type payment_status as enum (
  'unpaid',
  'awaiting_payment',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
);
create type fulfillment_status as enum (
  'unfulfilled',
  'reserved',
  'picking',
  'packed',
  'dispatched',
  'delivered',
  'returned'
);
create type inventory_quality_status as enum (
  'sellable',
  'quarantined',
  'expired',
  'damaged'
);
create type reservation_status as enum (
  'active',
  'released',
  'converted',
  'expired'
);
