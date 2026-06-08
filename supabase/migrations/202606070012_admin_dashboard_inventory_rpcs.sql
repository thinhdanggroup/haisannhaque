create or replace function get_admin_dashboard_metrics()
returns table (
  open_order_count bigint,
  low_stock_sku_count bigint,
  pending_refund_count bigint,
  open_complaint_count bigint,
  purchase_order_count bigint,
  revenue_today numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('*');

  select
    (
      select count(*)::bigint
      from orders
      where order_status in (
        'awaiting_payment',
        'payment_failed',
        'pending_confirmation',
        'confirmed',
        'picking',
        'packed',
        'dispatched',
        'delivery_attempted'
      )
    ) as open_order_count,
    (
      select count(distinct product_variants.sku)::bigint
      from product_variants
      cross join warehouses
      where product_variants.is_active = true
        and warehouses.is_active = true
        and calculate_available_stock(product_variants.id, warehouses.id) <= 5
    ) as low_stock_sku_count,
    (
      select count(*)::bigint
      from refunds
      where status in ('requested', 'approved', 'processing')
    ) as pending_refund_count,
    (
      select count(*)::bigint
      from complaint_cases
      where status in ('open', 'investigating')
    ) as open_complaint_count,
    (
      select count(*)::bigint
      from purchase_orders
      where status in ('draft', 'submitted', 'partially_received')
    ) as purchase_order_count,
    (
      select coalesce(sum(grand_total), 0)
      from orders
      where order_status = 'completed'
        and placed_at >= current_date::timestamptz
        and placed_at < (current_date + 1)::timestamptz
    ) as revenue_today;
$$;

create or replace function get_admin_inventory_rows(
  input_variant_limit integer default 100,
  input_warehouse_limit integer default 20
)
returns table (
  sku text,
  product_name text,
  warehouse_code text,
  warehouse_name text,
  available_quantity numeric,
  unit text,
  quality text
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('inventory:read');

  with limits as (
    select
      least(greatest(coalesce(input_variant_limit, 100), 0), 500) as variant_limit,
      least(greatest(coalesce(input_warehouse_limit, 20), 0), 50) as warehouse_limit
  ),
  active_variants as (
    select
      product_variants.id,
      product_variants.sku,
      products.name as product_name,
      product_variants.unit
    from product_variants
    join products on products.id = product_variants.product_id
    where product_variants.is_active = true
    order by product_variants.sku asc
    limit (select variant_limit from limits)
  ),
  active_warehouses as (
    select
      warehouses.id,
      warehouses.code,
      warehouses.name
    from warehouses
    where warehouses.is_active = true
    order by warehouses.code asc
    limit (select warehouse_limit from limits)
  )
  select
    active_variants.sku,
    active_variants.product_name,
    active_warehouses.code as warehouse_code,
    active_warehouses.name as warehouse_name,
    calculate_available_stock(active_variants.id, active_warehouses.id) as available_quantity,
    active_variants.unit,
    'sellable'::text as quality
  from active_variants
  cross join active_warehouses
  order by active_variants.sku asc, active_warehouses.code asc;
$$;
