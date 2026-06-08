begin;

do $$
declare
  category_id uuid;
  product_id uuid;
  variant_id uuid;
  cart_id uuid;
  warehouse_id uuid;
  result jsonb;
  idempotent_result jsonb;
  reservation_count integer;
begin
  insert into categories (slug, name)
  values ('checkout-seafood', 'Checkout Seafood')
  returning id into category_id;

  insert into products (slug, name, temperature_class, status)
  values ('checkout-salmon', 'Checkout Salmon', 'fresh', 'published')
  returning id into product_id;

  insert into product_categories (product_id, category_id)
  values (product_id, category_id);

  insert into product_variants (product_id, sku, unit, list_price)
  values (product_id, 'CHECKOUT-SALMON-500G', '500g', 100000)
  returning id into variant_id;

  select id
  into warehouse_id
  from warehouses
  where code = 'HCM-01';

  insert into stock_ledger_entries (
    variant_id,
    warehouse_id,
    movement_type,
    quantity_delta,
    source_doc_type
  )
  values (variant_id, warehouse_id, 'receipt', 5, 'test');

  insert into carts (session_id)
  values ('checkout-test-session')
  returning id into cart_id;

  insert into cart_items (cart_id, variant_id, quantity, unit_price)
  values (cart_id, variant_id, 2, 100000);

  result := create_order_from_checkout(
    jsonb_build_object(
      'cartId', cart_id,
      'paymentMethod', 'cod',
      'deliveryMethod', 'local_delivery',
      'receiverName', 'Nguyen Van A',
      'phone', '0900000000',
      'province', 'Ho Chi Minh',
      'district', 'Quan 1',
      'ward', 'Ben Nghe',
      'addressLine', '1 Le Loi',
      'idempotencyKey', 'checkout-test-1'
    ),
    'checkout-test-1'
  );

  if result ->> 'order_status' <> 'pending_confirmation' then
    raise exception 'Expected pending_confirmation order, got %', result ->> 'order_status';
  end if;

  select count(*)
  into reservation_count
  from stock_reservations
  where order_id = (result ->> 'order_id')::uuid
    and status = 'active';

  if reservation_count <> 1 then
    raise exception 'Expected 1 active reservation, got %', reservation_count;
  end if;

  if not exists (
    select 1
    from carts
    where id = cart_id
      and status = 'converted'
  ) then
    raise exception 'Expected cart to be converted';
  end if;

  idempotent_result := create_order_from_checkout(
    jsonb_build_object(
      'cartId', cart_id,
      'paymentMethod', 'cod',
      'deliveryMethod', 'local_delivery',
      'receiverName', 'Nguyen Van A',
      'phone', '0900000000',
      'province', 'Ho Chi Minh',
      'district', 'Quan 1',
      'ward', 'Ben Nghe',
      'addressLine', '1 Le Loi',
      'idempotencyKey', 'checkout-test-1'
    ),
    'checkout-test-1'
  );

  if idempotent_result ->> 'order_id' <> result ->> 'order_id' then
    raise exception 'Expected idempotent checkout to return the original order';
  end if;
end $$;

rollback;
