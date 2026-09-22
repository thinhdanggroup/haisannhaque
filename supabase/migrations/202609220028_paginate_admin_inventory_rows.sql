-- get_admin_inventory_rows silently capped active variants at 100, ordered by
-- SKU ascending, with no search and no indication the list was truncated. A
-- shop past ~100 active SKUs loses every variant whose SKU sorts after the
-- cutoff -- new products included -- from the inventory screen. Replace the
-- flat cap with real search + pagination, same fix already applied to the
-- admin products list in 202609210027.
drop function if exists get_admin_inventory_rows(integer, integer);

create or replace function get_admin_inventory_rows(
  input_search text default null,
  input_page integer default 1,
  input_page_size integer default 25
)
returns table (
  sku text,
  product_name text,
  warehouse_code text,
  warehouse_name text,
  available_quantity numeric,
  unit text,
  quality text,
  total_variant_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('inventory:read');

  with params as (
    select
      nullif(trim(coalesce(input_search, '')), '') as search,
      greatest(coalesce(input_page, 1), 1) as page,
      least(greatest(coalesce(input_page_size, 25), 1), 100) as page_size
  ),
  matching_variants as (
    select
      product_variants.id,
      product_variants.sku,
      products.name as product_name,
      product_variants.unit
    from product_variants
    join products on products.id = product_variants.product_id
    where product_variants.is_active = true
      and (
        (select search from params) is null
        or product_variants.sku ilike '%' || (select search from params) || '%'
        or products.name ilike '%' || (select search from params) || '%'
      )
  ),
  counted as (
    select count(*)::bigint as total from matching_variants
  ),
  paged_variants as (
    select *
    from matching_variants
    order by product_name asc, sku asc
    limit (select page_size from params)
    offset ((select page from params) - 1) * (select page_size from params)
  ),
  active_warehouses as (
    select
      warehouses.id,
      warehouses.code,
      warehouses.name
    from warehouses
    where warehouses.is_active = true
    order by warehouses.code asc
  )
  select
    paged_variants.sku,
    paged_variants.product_name,
    active_warehouses.code as warehouse_code,
    active_warehouses.name as warehouse_name,
    calculate_available_stock(paged_variants.id, active_warehouses.id) as available_quantity,
    paged_variants.unit,
    'sellable'::text as quality,
    (select total from counted) as total_variant_count
  from paged_variants
  cross join active_warehouses
  order by paged_variants.product_name asc, paged_variants.sku asc, active_warehouses.code asc;
$$;
