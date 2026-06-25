-- Add default_variant_id to product card RPCs so the listing page
-- can add to cart without navigating to the product detail page.

drop function if exists get_products_by_category(text);
drop function if exists search_products(text);

create function get_products_by_category(input_category_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  image_url text,
  list_price numeric,
  sale_price numeric,
  unit text,
  is_available boolean,
  default_variant_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with display_variants as (
    select distinct on (product_variants.product_id)
      product_variants.product_id,
      product_variants.id          as variant_id,
      product_variants.list_price,
      product_variants.sale_price,
      product_variants.unit
    from product_variants
    where product_variants.is_active = true
    order by
      product_variants.product_id,
      coalesce(product_variants.sale_price, product_variants.list_price) asc,
      product_variants.list_price asc,
      product_variants.sku asc,
      product_variants.id asc
  )
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
    display_variants.list_price,
    display_variants.sale_price,
    display_variants.unit,
    coalesce(
      (
        select bool_or(calculate_available_stock(active_variants.id, warehouses.id) > 0)
        from product_variants active_variants
        cross join warehouses
        where active_variants.product_id = products.id
          and active_variants.is_active = true
          and warehouses.is_active = true
      ),
      false
    ) as is_available,
    display_variants.variant_id as default_variant_id
  from products
  join display_variants on display_variants.product_id = products.id
  join product_categories on product_categories.product_id = products.id
  join categories on categories.id = product_categories.category_id
  where categories.slug = input_category_slug
    and categories.is_active = true
    and products.status = 'published'
  order by products.created_at desc;
$$;

create function search_products(input_query text)
returns table (
  id uuid,
  slug text,
  name text,
  image_url text,
  list_price numeric,
  sale_price numeric,
  unit text,
  is_available boolean,
  default_variant_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with display_variants as (
    select distinct on (product_variants.product_id)
      product_variants.product_id,
      product_variants.id          as variant_id,
      product_variants.list_price,
      product_variants.sale_price,
      product_variants.unit
    from product_variants
    where product_variants.is_active = true
    order by
      product_variants.product_id,
      coalesce(product_variants.sale_price, product_variants.list_price) asc,
      product_variants.list_price asc,
      product_variants.sku asc,
      product_variants.id asc
  )
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
    display_variants.list_price,
    display_variants.sale_price,
    display_variants.unit,
    coalesce(
      (
        select bool_or(calculate_available_stock(active_variants.id, warehouses.id) > 0)
        from product_variants active_variants
        cross join warehouses
        where active_variants.product_id = products.id
          and active_variants.is_active = true
          and warehouses.is_active = true
      ),
      false
    ) as is_available,
    display_variants.variant_id as default_variant_id
  from products
  join display_variants on display_variants.product_id = products.id
  where products.status = 'published'
    and (
      input_query = ''
      or products.search_document @@ plainto_tsquery('simple'::regconfig, input_query)
      or products.name % input_query
      or exists (
        select 1
        from product_variants active_variants
        where active_variants.product_id = products.id
          and active_variants.is_active = true
          and active_variants.sku ilike '%' || input_query || '%'
      )
    )
  order by
    case when input_query = '' then 0 else similarity(products.name, input_query) end desc,
    products.created_at desc
  limit 48;
$$;
