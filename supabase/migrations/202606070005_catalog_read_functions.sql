create or replace function get_products_by_category(input_category_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  image_url text,
  list_price numeric,
  sale_price numeric,
  is_available boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    products.id,
    products.slug,
    products.name,
    (
      select product_images.url
      from product_images
      where product_images.product_id = products.id
      order by product_images.sort_order asc, product_images.id asc
      limit 1
    ) as image_url,
    min(product_variants.list_price) as list_price,
    min(product_variants.sale_price) filter (where product_variants.sale_price is not null) as sale_price,
    coalesce(bool_or(calculate_available_stock(product_variants.id, warehouses.id) > 0), false) as is_available
  from products
  join product_variants on product_variants.product_id = products.id
  join product_categories on product_categories.product_id = products.id
  join categories on categories.id = product_categories.category_id
  left join warehouses on warehouses.is_active = true
  where categories.slug = input_category_slug
    and categories.is_active = true
    and products.status = 'published'
    and product_variants.is_active = true
  group by products.id
  order by products.created_at desc;
$$;

create or replace function search_products(input_query text)
returns table (
  id uuid,
  slug text,
  name text,
  image_url text,
  list_price numeric,
  sale_price numeric,
  is_available boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    products.id,
    products.slug,
    products.name,
    (
      select product_images.url
      from product_images
      where product_images.product_id = products.id
      order by product_images.sort_order asc, product_images.id asc
      limit 1
    ) as image_url,
    min(product_variants.list_price) as list_price,
    min(product_variants.sale_price) filter (where product_variants.sale_price is not null) as sale_price,
    coalesce(bool_or(calculate_available_stock(product_variants.id, warehouses.id) > 0), false) as is_available
  from products
  join product_variants on product_variants.product_id = products.id
  left join warehouses on warehouses.is_active = true
  where products.status = 'published'
    and product_variants.is_active = true
    and (
      input_query = ''
      or products.search_document @@ plainto_tsquery('simple'::regconfig, input_query)
      or products.name % input_query
      or product_variants.sku ilike '%' || input_query || '%'
    )
  group by products.id
  order by
    case when input_query = '' then 0 else similarity(products.name, input_query) end desc,
    products.created_at desc
  limit 48;
$$;
