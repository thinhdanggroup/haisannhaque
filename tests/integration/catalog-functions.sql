begin;

insert into categories (slug, name)
values ('sashimi', 'Sashimi')
on conflict (slug) do update
set name = excluded.name;

insert into products (slug, name, short_description, temperature_class, status)
values ('ca-hoi-sashimi', 'Ca hoi sashimi', 'Fresh salmon sashimi', 'fresh', 'published')
on conflict (slug) do update
set name = excluded.name,
    short_description = excluded.short_description,
    temperature_class = excluded.temperature_class,
    status = excluded.status;

insert into product_categories (product_id, category_id)
select products.id, categories.id
from products, categories
where products.slug = 'ca-hoi-sashimi'
  and categories.slug = 'sashimi'
on conflict (product_id, category_id) do nothing;

insert into product_variants (product_id, sku, unit, list_price, sale_price)
select id, 'SALMON-SASHIMI-500G', '500g', 150000, 129000
from products
where slug = 'ca-hoi-sashimi'
on conflict (sku) do update
set unit = excluded.unit,
    list_price = excluded.list_price,
    sale_price = excluded.sale_price,
    is_active = true;

insert into stock_ledger_entries (
  variant_id,
  warehouse_id,
  movement_type,
  quantity_delta,
  source_doc_type
)
select product_variants.id, warehouses.id, 'receipt', 5, 'test'
from product_variants, warehouses
where product_variants.sku = 'SALMON-SASHIMI-500G'
  and warehouses.code = 'HCM-01';

do $$
declare
  category_count integer;
  search_count integer;
  category_unit text;
  search_unit text;
begin
  select count(*)
  into category_count
  from get_products_by_category('sashimi')
  where slug = 'ca-hoi-sashimi';

  if category_count <> 1 then
    raise exception 'Expected category result for ca-hoi-sashimi, got %', category_count;
  end if;

  select unit
  into category_unit
  from get_products_by_category('sashimi')
  where slug = 'ca-hoi-sashimi';

  if category_unit <> '500g' then
    raise exception 'Expected category unit 500g, got %', category_unit;
  end if;

  select count(*)
  into search_count
  from search_products('salmon')
  where slug = 'ca-hoi-sashimi';

  if search_count <> 1 then
    raise exception 'Expected search result for ca-hoi-sashimi, got %', search_count;
  end if;

  select unit
  into search_unit
  from search_products('salmon')
  where slug = 'ca-hoi-sashimi';

  if search_unit <> '500g' then
    raise exception 'Expected search unit 500g, got %', search_unit;
  end if;
end $$;

rollback;
