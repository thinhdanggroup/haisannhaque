create or replace function create_order_from_checkout(
  checkout_payload jsonb,
  input_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_order orders%rowtype;
  created_order orders%rowtype;
  cart_record carts%rowtype;
  default_warehouse_id uuid;
  cart_subtotal numeric(12,2);
  selected_payment_method text;
  initial_order_status order_status;
  initial_payment_status payment_status;
  cart_item_record record;
begin
  select *
  into existing_order
  from orders
  where idempotency_key = input_idempotency_key;

  if found then
    return jsonb_build_object(
      'order_id', existing_order.id,
      'order_no', existing_order.order_no,
      'order_status', existing_order.order_status,
      'payment_status', existing_order.payment_status,
      'payment_method', checkout_payload ->> 'paymentMethod',
      'next_step', case when existing_order.payment_status = 'awaiting_payment' then 'payment' else 'confirmation' end
    );
  end if;

  selected_payment_method := checkout_payload ->> 'paymentMethod';

  select *
  into cart_record
  from carts
  where id = (checkout_payload ->> 'cartId')::uuid
  for update;

  if not found then
    raise exception 'Cart not found';
  end if;

  select id
  into default_warehouse_id
  from warehouses
  where is_active = true
  order by code asc
  limit 1;

  if default_warehouse_id is null then
    raise exception 'No active warehouse available';
  end if;

  select coalesce(sum(cart_items.quantity * coalesce(product_variants.sale_price, product_variants.list_price)), 0)
  into cart_subtotal
  from cart_items
  join product_variants on product_variants.id = cart_items.variant_id
  where cart_items.cart_id = cart_record.id
    and product_variants.is_active = true;

  if cart_subtotal <= 0 then
    raise exception 'Cart is empty';
  end if;

  initial_order_status := case
    when selected_payment_method in ('momo', 'vnpay', 'bank_transfer') then 'awaiting_payment'::order_status
    else 'pending_confirmation'::order_status
  end;

  initial_payment_status := case
    when selected_payment_method in ('momo', 'vnpay', 'bank_transfer') then 'awaiting_payment'::payment_status
    else 'unpaid'::payment_status
  end;

  insert into orders (
    order_no,
    customer_id,
    source_channel,
    order_status,
    payment_status,
    fulfillment_status,
    subtotal,
    discount_total,
    shipping_total,
    grand_total,
    idempotency_key,
    placed_at
  )
  values (
    'DHS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    cart_record.customer_id,
    'web',
    initial_order_status,
    initial_payment_status,
    'reserved',
    cart_subtotal,
    0,
    0,
    cart_subtotal,
    input_idempotency_key,
    now()
  )
  returning * into created_order;

  for cart_item_record in
    select
      cart_items.variant_id,
      cart_items.quantity,
      products.name as product_name,
      product_variants.sku,
      coalesce(product_variants.sale_price, product_variants.list_price) as unit_price
    from cart_items
    join product_variants on product_variants.id = cart_items.variant_id
    join products on products.id = product_variants.product_id
    where cart_items.cart_id = cart_record.id
      and product_variants.is_active = true
  loop
    perform reserve_stock(
      cart_record.id,
      created_order.id,
      cart_item_record.variant_id,
      default_warehouse_id,
      cart_item_record.quantity,
      15
    );

    insert into order_items (
      order_id,
      variant_id,
      product_name_snapshot,
      sku_snapshot,
      quantity,
      unit_price,
      discount_total
    )
    values (
      created_order.id,
      cart_item_record.variant_id,
      cart_item_record.product_name,
      cart_item_record.sku,
      cart_item_record.quantity,
      cart_item_record.unit_price,
      0
    );
  end loop;

  update carts
  set status = 'converted',
      updated_at = now()
  where id = cart_record.id;

  return jsonb_build_object(
    'order_id', created_order.id,
    'order_no', created_order.order_no,
    'order_status', created_order.order_status,
    'payment_status', created_order.payment_status,
    'payment_method', selected_payment_method,
    'next_step', case when initial_payment_status = 'awaiting_payment' then 'payment' else 'confirmation' end
  );
end;
$$;
