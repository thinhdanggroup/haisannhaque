create or replace function calculate_available_stock(
  input_variant_id uuid,
  input_warehouse_id uuid
)
returns numeric
language sql
stable
set search_path = public
as $$
  with sellable_on_hand as (
    select coalesce(sum(stock_ledger_entries.quantity_delta), 0) as qty
    from stock_ledger_entries
    left join lots on lots.id = stock_ledger_entries.lot_id
    where stock_ledger_entries.variant_id = input_variant_id
      and stock_ledger_entries.warehouse_id = input_warehouse_id
      and (
        stock_ledger_entries.lot_id is null
        or (
          lots.quality_status = 'sellable'
          and (lots.expiry_at is null or lots.expiry_at > now())
        )
      )
  ),
  active_reservations as (
    select coalesce(sum(quantity), 0) as qty
    from stock_reservations
    where variant_id = input_variant_id
      and warehouse_id = input_warehouse_id
      and status = 'active'
      and expires_at > now()
  )
  select greatest(sellable_on_hand.qty - active_reservations.qty, 0)
  from sellable_on_hand, active_reservations;
$$;

create or replace function release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released_count integer;
begin
  update stock_reservations
  set status = 'expired'
  where status = 'active'
    and expires_at <= now();

  get diagnostics released_count = row_count;
  return released_count;
end;
$$;

create or replace function reserve_stock(
  input_cart_id uuid,
  input_order_id uuid,
  input_variant_id uuid,
  input_warehouse_id uuid,
  input_quantity numeric,
  input_ttl_minutes integer default 15
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  available_quantity numeric;
  reservation_id uuid;
begin
  if input_quantity <= 0 then
    raise exception 'Reservation quantity must be positive';
  end if;

  if input_cart_id is null and input_order_id is null then
    raise exception 'Reservation requires a cart or order reference';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(input_variant_id::text || ':' || input_warehouse_id::text, 0)
  );

  perform release_expired_reservations();

  select calculate_available_stock(input_variant_id, input_warehouse_id)
  into available_quantity;

  if available_quantity < input_quantity then
    raise exception 'Insufficient stock for variant % in warehouse %', input_variant_id, input_warehouse_id;
  end if;

  insert into stock_reservations (
    cart_id,
    order_id,
    variant_id,
    warehouse_id,
    quantity,
    expires_at
  )
  values (
    input_cart_id,
    input_order_id,
    input_variant_id,
    input_warehouse_id,
    input_quantity,
    now() + make_interval(mins => input_ttl_minutes)
  )
  returning id into reservation_id;

  return reservation_id;
end;
$$;
