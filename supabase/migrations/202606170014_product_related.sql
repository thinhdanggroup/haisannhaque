create table product_related (
  product_id uuid not null references products(id) on delete cascade,
  related_product_id uuid not null references products(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, related_product_id),
  check (product_id != related_product_id)
);

alter table product_related enable row level security;

-- Admins can manage related products
create policy "admin_manage_product_related"
  on product_related
  for all
  using (
    has_admin_permission('products:update')
  );

-- Public can read related products for published products
create policy "public_read_product_related"
  on product_related
  for select
  using (
    exists (
      select 1 from products p
      where p.id = product_id
      and p.status = 'published'
    )
  );
