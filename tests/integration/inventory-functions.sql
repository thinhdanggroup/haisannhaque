begin;

insert into categories (slug, name)
values ('test-seafood', 'Test Seafood');

insert into products (slug, name, temperature_class, status)
values ('test-salmon', 'Test Salmon', 'fresh', 'published');

insert into product_variants (product_id, sku, unit, list_price)
select id, 'TEST-SALMON-500G', '500g', 100000
from products
where slug = 'test-salmon';

insert into stock_ledger_entries (
  variant_id,
  warehouse_id,
  movement_type,
  quantity_delta,
  source_doc_type
)
select product_variants.id, warehouses.id, 'receipt', 10, 'test'
from product_variants, warehouses
where product_variants.sku = 'TEST-SALMON-500G'
  and warehouses.code = 'HCM-01';

select calculate_available_stock(product_variants.id, warehouses.id) as available_qty
from product_variants, warehouses
where product_variants.sku = 'TEST-SALMON-500G'
  and warehouses.code = 'HCM-01';

insert into carts (session_id)
values ('test-session');

select reserve_stock(
  carts.id,
  null,
  product_variants.id,
  warehouses.id,
  3,
  15
) as reservation_id
from carts, product_variants, warehouses
where carts.session_id = 'test-session'
  and product_variants.sku = 'TEST-SALMON-500G'
  and warehouses.code = 'HCM-01';

do $$
declare
  available_qty numeric;
begin
  select calculate_available_stock(product_variants.id, warehouses.id)
  into available_qty
  from product_variants, warehouses
  where product_variants.sku = 'TEST-SALMON-500G'
    and warehouses.code = 'HCM-01';

  if available_qty <> 7 then
    raise exception 'Expected available stock to be 7 after reservation, got %', available_qty;
  end if;
end $$;

rollback;
