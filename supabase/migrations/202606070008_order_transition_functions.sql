create or replace function transition_order_status(
  input_order_id uuid,
  input_next_status order_status,
  input_actor_id uuid default null
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order orders%rowtype;
  allowed_next_statuses order_status[];
begin
  perform assert_admin_permission_rpc('orders:update');

  select *
  into target_order
  from orders
  where id = input_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  allowed_next_statuses := case target_order.order_status
    when 'draft_checkout' then array['awaiting_payment', 'pending_confirmation', 'cancelled']::order_status[]
    when 'awaiting_payment' then array['pending_confirmation', 'payment_failed', 'cancelled']::order_status[]
    when 'payment_failed' then array['awaiting_payment', 'cancelled']::order_status[]
    when 'pending_confirmation' then array['confirmed', 'cancelled']::order_status[]
    when 'confirmed' then array['picking', 'cancelled']::order_status[]
    when 'picking' then array['packed', 'cancelled']::order_status[]
    when 'packed' then array['dispatched']::order_status[]
    when 'dispatched' then array['delivery_attempted', 'delivered']::order_status[]
    when 'delivery_attempted' then array['dispatched', 'cancelled']::order_status[]
    when 'delivered' then array['completed', 'returned', 'partially_returned']::order_status[]
    when 'completed' then array['returned', 'partially_returned', 'refunded']::order_status[]
    when 'returned' then array['refunded']::order_status[]
    when 'partially_returned' then array['refunded', 'completed']::order_status[]
    else array[]::order_status[]
  end;

  if not input_next_status = any(allowed_next_statuses) then
    raise exception 'Invalid order transition from % to %', target_order.order_status, input_next_status;
  end if;

  update orders
  set order_status = input_next_status,
      fulfillment_status = case
        when input_next_status in ('confirmed') then 'reserved'::fulfillment_status
        when input_next_status in ('picking') then 'picking'::fulfillment_status
        when input_next_status in ('packed') then 'packed'::fulfillment_status
        when input_next_status in ('dispatched', 'delivery_attempted') then 'dispatched'::fulfillment_status
        when input_next_status in ('delivered', 'completed') then 'delivered'::fulfillment_status
        when input_next_status in ('returned', 'partially_returned') then 'returned'::fulfillment_status
        else fulfillment_status
      end
  where id = input_order_id
  returning * into target_order;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    input_actor_id,
    'order_status_transitioned',
    'orders',
    input_order_id,
    jsonb_build_object('nextStatus', input_next_status)
  );

  if input_next_status = 'completed' then
    perform award_loyalty_points(input_order_id);
  end if;

  return target_order;
end;
$$;
