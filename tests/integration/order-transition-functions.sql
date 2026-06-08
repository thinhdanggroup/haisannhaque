begin;

do $$
declare
  catalog_actor_id uuid := '018f0000-0000-4000-8000-000000000088';
  support_actor_id uuid := '018f0000-0000-4000-8000-000000000089';
  catalog_manager_role_id uuid;
  customer_service_role_id uuid;
  order_id uuid;
begin
  insert into auth.users (id)
  values (catalog_actor_id), (support_actor_id)
  on conflict (id) do nothing;

  select id
  into catalog_manager_role_id
  from admin_roles
  where name = 'catalog_manager';

  select id
  into customer_service_role_id
  from admin_roles
  where name = 'customer_service';

  insert into user_admin_roles (user_id, role_id)
  values
    (catalog_actor_id, catalog_manager_role_id),
    (support_actor_id, customer_service_role_id)
  on conflict (user_id, role_id) do nothing;

  insert into orders (
    order_no,
    source_channel,
    order_status,
    payment_status,
    fulfillment_status,
    subtotal,
    discount_total,
    shipping_total,
    grand_total,
    idempotency_key
  )
  values (
    'DHS-TRANSITION',
    'web',
    'pending_confirmation',
    'unpaid',
    'reserved',
    100000,
    0,
    0,
    100000,
    'transition-test'
  )
  returning id into order_id;

  perform set_config('request.jwt.claim.sub', catalog_actor_id::text, true);

  begin
    perform transition_order_status(order_id, 'confirmed', catalog_actor_id);
    raise exception 'Expected catalog manager to be denied order transition RPC access';
  exception
    when insufficient_privilege then
      null;
  end;

  perform set_config('request.jwt.claim.sub', support_actor_id::text, true);

  perform transition_order_status(order_id, 'confirmed', support_actor_id);

  if not exists (
    select 1
    from orders
    where id = order_id
      and order_status = 'confirmed'
  ) then
    raise exception 'Expected order to transition to confirmed';
  end if;

  begin
    perform transition_order_status(order_id, 'completed', null);
    raise exception 'Expected invalid transition to fail';
  exception
    when others then
      if sqlerrm = 'Expected invalid transition to fail' then
        raise;
      end if;
  end;
end $$;

rollback;
