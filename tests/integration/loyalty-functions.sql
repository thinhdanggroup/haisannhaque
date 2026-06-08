begin;

do $$
declare
  customer_id uuid;
  order_id uuid;
  first_award integer;
  second_award integer;
  point_balance integer;
begin
  insert into customers (email, full_name)
  values ('loyalty@example.com', 'Loyalty Customer')
  returning id into customer_id;

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
    'DHS-LOYALTY',
    customer_id,
    'web',
    'completed',
    'paid',
    'delivered',
    125000,
    0,
    0,
    125000,
    'loyalty-test',
    now()
  )
  returning id into order_id;

  first_award := award_loyalty_points(order_id);
  second_award := award_loyalty_points(order_id);

  select loyalty_points
  into point_balance
  from customers
  where id = customer_id;

  if first_award <> 125 then
    raise exception 'Expected first award to be 125, got %', first_award;
  end if;

  if second_award <> 0 then
    raise exception 'Expected second award to be idempotent, got %', second_award;
  end if;

  if point_balance <> 125 then
    raise exception 'Expected point balance to be 125, got %', point_balance;
  end if;
end $$;

rollback;
