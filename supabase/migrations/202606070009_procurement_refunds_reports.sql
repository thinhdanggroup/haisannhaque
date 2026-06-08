create type purchase_order_status as enum (
  'draft',
  'submitted',
  'partially_received',
  'received',
  'cancelled'
);

create type refund_status as enum (
  'requested',
  'approved',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create type complaint_case_status as enum (
  'open',
  'investigating',
  'resolved',
  'closed'
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  tax_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_no text not null unique,
  supplier_id uuid not null references suppliers(id),
  destination_warehouse_id uuid not null references warehouses(id),
  status purchase_order_status not null default 'draft',
  expected_at timestamptz,
  ordered_total numeric(12,2) not null default 0,
  received_total numeric(12,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  ordered_qty numeric(12,3) not null check (ordered_qty > 0),
  received_qty numeric(12,3) not null default 0 check (received_qty >= 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  line_total numeric(12,2) generated always as (ordered_qty * unit_cost) stored
);

create table goods_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id),
  warehouse_id uuid not null references warehouses(id),
  received_by uuid references auth.users(id),
  received_at timestamptz not null default now(),
  notes text
);

create table goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  goods_receipt_id uuid not null references goods_receipts(id) on delete cascade,
  purchase_order_line_id uuid not null references purchase_order_lines(id),
  variant_id uuid not null references product_variants(id),
  lot_id uuid references lots(id),
  received_qty numeric(12,3) not null check (received_qty > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0)
);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  payment_id uuid references payments(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  refund_method text not null,
  reason text not null,
  status refund_status not null default 'requested',
  raw_payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table complaint_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  status complaint_case_status not null default 'open',
  reason text not null,
  resolution text,
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_name_idx on suppliers using gin (name gin_trgm_ops);
create index purchase_orders_supplier_id_idx on purchase_orders (supplier_id);
create index purchase_orders_status_idx on purchase_orders (status);
create index purchase_order_lines_purchase_order_id_idx on purchase_order_lines (purchase_order_id);
create index goods_receipts_purchase_order_id_idx on goods_receipts (purchase_order_id);
create index refunds_order_id_idx on refunds (order_id);
create index refunds_status_idx on refunds (status);
create index complaint_cases_status_idx on complaint_cases (status);

alter table suppliers enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_lines enable row level security;
alter table goods_receipts enable row level security;
alter table goods_receipt_lines enable row level security;
alter table refunds enable row level security;
alter table complaint_cases enable row level security;

create or replace function has_admin_permission(input_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with role_permissions(role_name, permission) as (
    values
      ('super_admin', '*'),
      ('catalog_manager', 'products:read'),
      ('catalog_manager', 'products:create'),
      ('catalog_manager', 'products:update'),
      ('catalog_manager', 'categories:update'),
      ('marketing', 'cms:update'),
      ('marketing', 'promotions:update'),
      ('customer_service', 'orders:read'),
      ('customer_service', 'orders:update'),
      ('customer_service', 'customers:read'),
      ('customer_service', 'complaints:read'),
      ('customer_service', 'complaints:update'),
      ('warehouse', 'inventory:read'),
      ('warehouse', 'inventory:update'),
      ('warehouse', 'orders:fulfill'),
      ('procurement', 'purchase_orders:read'),
      ('procurement', 'purchase_orders:update'),
      ('procurement', 'suppliers:update'),
      ('finance', 'payments:read'),
      ('finance', 'refunds:create'),
      ('finance', 'reports:read'),
      ('reporter', 'reports:read')
  )
  select exists (
    select 1
    from user_admin_roles
    join admin_roles on admin_roles.id = user_admin_roles.role_id
    join role_permissions on role_permissions.role_name = admin_roles.name
    where user_admin_roles.user_id = auth.uid()
      and (role_permissions.permission = '*' or role_permissions.permission = input_permission)
  );
$$;

create or replace function assert_admin_permission_rpc(input_permission text)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not has_admin_permission(input_permission) then
    raise exception 'Admin privileges required' using errcode = '42501';
  end if;
end;
$$;

drop policy if exists "admins can manage admin roles" on admin_roles;
drop policy if exists "admins can manage user admin roles" on user_admin_roles;

create policy "admins can read admin roles"
on admin_roles for select
using (is_admin());

create policy "super admins can manage admin roles"
on admin_roles for all
using (has_admin_permission('*'))
with check (has_admin_permission('*'));

create policy "admins can read own admin role assignments"
on user_admin_roles for select
using (user_id = auth.uid());

create policy "super admins can manage user admin roles"
on user_admin_roles for all
using (has_admin_permission('*'))
with check (has_admin_permission('*'));

create policy "procurement can read suppliers"
on suppliers for select
using (has_admin_permission('purchase_orders:read') or has_admin_permission('suppliers:update'));

create policy "procurement can manage suppliers"
on suppliers for all
using (has_admin_permission('suppliers:update'))
with check (has_admin_permission('suppliers:update'));

create policy "procurement can read purchase orders"
on purchase_orders for select
using (has_admin_permission('purchase_orders:read'));

create policy "procurement can manage purchase orders"
on purchase_orders for all
using (has_admin_permission('purchase_orders:update'))
with check (has_admin_permission('purchase_orders:update'));

create policy "procurement can read purchase order lines"
on purchase_order_lines for select
using (has_admin_permission('purchase_orders:read'));

create policy "procurement can manage purchase order lines"
on purchase_order_lines for all
using (has_admin_permission('purchase_orders:update'))
with check (has_admin_permission('purchase_orders:update'));

create policy "procurement can read goods receipts"
on goods_receipts for select
using (has_admin_permission('purchase_orders:read'));

create policy "procurement can manage goods receipts"
on goods_receipts for all
using (has_admin_permission('purchase_orders:update'))
with check (has_admin_permission('purchase_orders:update'));

create policy "procurement can read goods receipt lines"
on goods_receipt_lines for select
using (has_admin_permission('purchase_orders:read'));

create policy "procurement can manage goods receipt lines"
on goods_receipt_lines for all
using (has_admin_permission('purchase_orders:update'))
with check (has_admin_permission('purchase_orders:update'));

create policy "finance can read refunds"
on refunds for select
using (has_admin_permission('payments:read'));

create policy "finance can manage refunds"
on refunds for all
using (has_admin_permission('refunds:create'))
with check (has_admin_permission('refunds:create'));

create policy "support can read complaint cases"
on complaint_cases for select
using (has_admin_permission('complaints:read'));

create policy "support can manage complaint cases"
on complaint_cases for all
using (has_admin_permission('complaints:update'))
with check (has_admin_permission('complaints:update'));

create or replace function create_purchase_order(
  purchase_order_payload jsonb,
  input_actor_id uuid default null
)
returns purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  created_purchase_order purchase_orders%rowtype;
  line_payload jsonb;
  ordered_total_amount numeric(12,2) := 0;
begin
  perform assert_admin_permission_rpc('purchase_orders:update');

  if coalesce(jsonb_array_length(purchase_order_payload -> 'lines'), 0) = 0 then
    raise exception 'Purchase order requires at least one line';
  end if;

  insert into purchase_orders (
    po_no,
    supplier_id,
    destination_warehouse_id,
    status,
    expected_at,
    created_by
  )
  values (
    'PO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    (purchase_order_payload ->> 'supplierId')::uuid,
    (purchase_order_payload ->> 'destinationWarehouseId')::uuid,
    'submitted',
    nullif(purchase_order_payload ->> 'expectedAt', '')::timestamptz,
    input_actor_id
  )
  returning * into created_purchase_order;

  for line_payload in
    select value
    from jsonb_array_elements(purchase_order_payload -> 'lines')
  loop
    if (line_payload ->> 'orderedQty')::numeric <= 0 then
      raise exception 'Purchase order line quantity must be positive';
    end if;

    insert into purchase_order_lines (
      purchase_order_id,
      variant_id,
      ordered_qty,
      unit_cost
    )
    values (
      created_purchase_order.id,
      (line_payload ->> 'variantId')::uuid,
      (line_payload ->> 'orderedQty')::numeric,
      (line_payload ->> 'unitCost')::numeric
    );

    ordered_total_amount := ordered_total_amount
      + ((line_payload ->> 'orderedQty')::numeric * (line_payload ->> 'unitCost')::numeric);
  end loop;

  update purchase_orders
  set ordered_total = ordered_total_amount,
      updated_at = now()
  where id = created_purchase_order.id
  returning * into created_purchase_order;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    input_actor_id,
    'purchase_order_created',
    'purchase_orders',
    created_purchase_order.id,
    jsonb_build_object('orderedTotal', ordered_total_amount)
  );

  return created_purchase_order;
end;
$$;

create or replace function receive_purchase_order(
  input_purchase_order_id uuid,
  receipt_payload jsonb,
  input_actor_id uuid default null
)
returns goods_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  target_purchase_order purchase_orders%rowtype;
  created_receipt goods_receipts%rowtype;
  line_payload jsonb;
  target_line purchase_order_lines%rowtype;
  created_lot_id uuid;
  received_total_amount numeric(12,2) := 0;
begin
  perform assert_admin_permission_rpc('purchase_orders:update');

  select *
  into target_purchase_order
  from purchase_orders
  where id = input_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if coalesce(jsonb_array_length(receipt_payload -> 'lines'), 0) = 0 then
    raise exception 'Goods receipt requires at least one line';
  end if;

  insert into goods_receipts (
    purchase_order_id,
    warehouse_id,
    received_by,
    notes
  )
  values (
    input_purchase_order_id,
    target_purchase_order.destination_warehouse_id,
    input_actor_id,
    receipt_payload ->> 'notes'
  )
  returning * into created_receipt;

  for line_payload in
    select value
    from jsonb_array_elements(receipt_payload -> 'lines')
  loop
    select *
    into target_line
    from purchase_order_lines
    where id = (line_payload ->> 'purchaseOrderLineId')::uuid
      and purchase_order_id = input_purchase_order_id
    for update;

    if not found then
      raise exception 'Purchase order line not found';
    end if;

    if (line_payload ->> 'receivedQty')::numeric <= 0 then
      raise exception 'Goods receipt quantity must be positive';
    end if;

    if target_line.received_qty + (line_payload ->> 'receivedQty')::numeric > target_line.ordered_qty then
      raise exception 'Goods receipt quantity exceeds ordered quantity';
    end if;

    insert into lots (
      variant_id,
      warehouse_id,
      lot_no,
      received_at,
      expiry_at,
      quality_status
    )
    values (
      target_line.variant_id,
      target_purchase_order.destination_warehouse_id,
      coalesce(nullif(line_payload ->> 'lotNo', ''), 'LOT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
      now(),
      nullif(line_payload ->> 'expiryAt', '')::timestamptz,
      'sellable'
    )
    returning id into created_lot_id;

    insert into goods_receipt_lines (
      goods_receipt_id,
      purchase_order_line_id,
      variant_id,
      lot_id,
      received_qty,
      unit_cost
    )
    values (
      created_receipt.id,
      target_line.id,
      target_line.variant_id,
      created_lot_id,
      (line_payload ->> 'receivedQty')::numeric,
      target_line.unit_cost
    );

    insert into stock_ledger_entries (
      variant_id,
      warehouse_id,
      lot_id,
      movement_type,
      quantity_delta,
      source_doc_type,
      source_doc_id,
      actor_id
    )
    values (
      target_line.variant_id,
      target_purchase_order.destination_warehouse_id,
      created_lot_id,
      'purchase_receipt',
      (line_payload ->> 'receivedQty')::numeric,
      'goods_receipts',
      created_receipt.id,
      input_actor_id
    );

    update purchase_order_lines
    set received_qty = received_qty + (line_payload ->> 'receivedQty')::numeric
    where id = target_line.id;

    received_total_amount := received_total_amount
      + ((line_payload ->> 'receivedQty')::numeric * target_line.unit_cost);
  end loop;

  update purchase_orders
  set received_total = received_total + received_total_amount,
      status = case
        when exists (
          select 1
          from purchase_order_lines
          where purchase_order_id = input_purchase_order_id
            and received_qty < ordered_qty
        )
        then 'partially_received'::purchase_order_status
        else 'received'::purchase_order_status
      end,
      updated_at = now()
  where id = input_purchase_order_id;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    input_actor_id,
    'purchase_order_received',
    'purchase_orders',
    input_purchase_order_id,
    jsonb_build_object('goodsReceiptId', created_receipt.id, 'receivedTotal', received_total_amount)
  );

  return created_receipt;
end;
$$;

create or replace function create_refund(
  refund_payload jsonb,
  input_actor_id uuid default null
)
returns refunds
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order orders%rowtype;
  created_refund refunds%rowtype;
  total_refunded_amount numeric(12,2);
  existing_refunded_amount numeric(12,2);
  target_payment payments%rowtype;
begin
  perform assert_admin_permission_rpc('refunds:create');

  select *
  into target_order
  from orders
  where id = (refund_payload ->> 'orderId')::uuid
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if (refund_payload ->> 'amount')::numeric <= 0 then
    raise exception 'Refund amount must be positive';
  end if;

  select coalesce(sum(amount), 0)
  into existing_refunded_amount
  from refunds
  where order_id = target_order.id
    and status not in ('failed', 'cancelled');

  if existing_refunded_amount + (refund_payload ->> 'amount')::numeric > target_order.grand_total then
    raise exception 'Refund amount exceeds remaining refundable amount';
  end if;

  if nullif(refund_payload ->> 'paymentId', '') is not null then
    select *
    into target_payment
    from payments
    where id = (refund_payload ->> 'paymentId')::uuid
      and order_id = target_order.id
    for update;

    if not found then
      raise exception 'Payment not found for order';
    end if;
  end if;

  insert into refunds (
    order_id,
    payment_id,
    amount,
    refund_method,
    reason,
    status,
    raw_payload,
    created_by,
    processed_at
  )
  values (
    target_order.id,
    nullif(refund_payload ->> 'paymentId', '')::uuid,
    (refund_payload ->> 'amount')::numeric,
    refund_payload ->> 'refundMethod',
    refund_payload ->> 'reason',
    'completed',
    refund_payload,
    input_actor_id,
    now()
  )
  returning * into created_refund;

  select coalesce(sum(amount), 0)
  into total_refunded_amount
  from refunds
  where order_id = target_order.id
    and status not in ('failed', 'cancelled');

  update orders
  set payment_status = case
        when total_refunded_amount >= target_order.grand_total then 'refunded'::payment_status
        else 'partially_refunded'::payment_status
      end,
      order_status = case
        when total_refunded_amount >= target_order.grand_total then 'refunded'::order_status
        else order_status
      end
  where id = target_order.id;

  if created_refund.payment_id is not null then
    update payments
    set status = case
      when total_refunded_amount >= target_order.grand_total then 'refunded'::payment_status
      else 'partially_refunded'::payment_status
    end
    where id = created_refund.payment_id;
  end if;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    input_actor_id,
    'refund_created',
    'refunds',
    created_refund.id,
    jsonb_build_object('orderId', target_order.id, 'amount', created_refund.amount)
  );

  return created_refund;
end;
$$;

create or replace function create_complaint_case(
  complaint_payload jsonb,
  input_actor_id uuid default null
)
returns complaint_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  created_complaint complaint_cases%rowtype;
begin
  perform assert_admin_permission_rpc('complaints:update');

  if length(coalesce(complaint_payload ->> 'reason', '')) < 3 then
    raise exception 'Complaint reason is required';
  end if;

  insert into complaint_cases (
    order_id,
    customer_id,
    reason,
    resolution,
    assigned_to
  )
  values (
    nullif(complaint_payload ->> 'orderId', '')::uuid,
    nullif(complaint_payload ->> 'customerId', '')::uuid,
    complaint_payload ->> 'reason',
    complaint_payload ->> 'resolution',
    input_actor_id
  )
  returning * into created_complaint;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    input_actor_id,
    'complaint_case_created',
    'complaint_cases',
    created_complaint.id,
    jsonb_build_object('orderId', created_complaint.order_id, 'customerId', created_complaint.customer_id)
  );

  return created_complaint;
end;
$$;

create or replace function get_daily_sales_report(
  input_from_date date,
  input_to_date date
)
returns table (
  report_date date,
  order_count bigint,
  item_count numeric,
  revenue_total numeric,
  discount_total numeric,
  shipping_total numeric,
  refund_total numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('reports:read');

  with report_days as (
    select generate_series(input_from_date, input_to_date, interval '1 day')::date as report_day
  ),
  order_totals as (
    select
      orders.placed_at::date as report_day,
      count(distinct orders.id)::bigint as order_count,
      coalesce(sum(orders.grand_total), 0) as revenue_total,
      coalesce(sum(orders.discount_total), 0) as discount_total,
      coalesce(sum(orders.shipping_total), 0) as shipping_total
    from orders
    where orders.placed_at >= input_from_date
      and orders.placed_at < input_to_date + interval '1 day'
      and orders.order_status not in ('cancelled', 'payment_failed')
    group by orders.placed_at::date
  ),
  item_totals as (
    select
      orders.placed_at::date as report_day,
      coalesce(sum(order_items.quantity), 0) as item_count
    from orders
    join order_items on order_items.order_id = orders.id
    where orders.placed_at >= input_from_date
      and orders.placed_at < input_to_date + interval '1 day'
      and orders.order_status not in ('cancelled', 'payment_failed')
    group by orders.placed_at::date
  ),
  refund_totals as (
    select
      refunds.created_at::date as report_day,
      coalesce(sum(refunds.amount), 0) as refund_total
    from refunds
    where refunds.created_at >= input_from_date
      and refunds.created_at < input_to_date + interval '1 day'
      and refunds.status not in ('failed', 'cancelled')
    group by refunds.created_at::date
  )
  select
    report_days.report_day as report_date,
    coalesce(order_totals.order_count, 0) as order_count,
    coalesce(item_totals.item_count, 0) as item_count,
    coalesce(order_totals.revenue_total, 0) as revenue_total,
    coalesce(order_totals.discount_total, 0) as discount_total,
    coalesce(order_totals.shipping_total, 0) as shipping_total,
    coalesce(refund_totals.refund_total, 0) as refund_total
  from report_days
  left join order_totals on order_totals.report_day = report_days.report_day
  left join item_totals on item_totals.report_day = report_days.report_day
  left join refund_totals on refund_totals.report_day = report_days.report_day
  order by report_days.report_day;
$$;

create or replace function get_product_sales_report(
  input_from_date date,
  input_to_date date
)
returns table (
  variant_id uuid,
  sku text,
  product_name text,
  quantity_sold numeric,
  revenue_total numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('reports:read');

  select
    order_items.variant_id,
    order_items.sku_snapshot as sku,
    order_items.product_name_snapshot as product_name,
    coalesce(sum(order_items.quantity), 0) as quantity_sold,
    coalesce(sum((order_items.quantity * order_items.unit_price) - order_items.discount_total), 0) as revenue_total
  from order_items
  join orders on orders.id = order_items.order_id
  where orders.placed_at >= input_from_date
    and orders.placed_at < input_to_date + interval '1 day'
    and orders.order_status not in ('cancelled', 'payment_failed')
  group by order_items.variant_id, order_items.sku_snapshot, order_items.product_name_snapshot
  order by revenue_total desc;
$$;

create or replace function get_promotion_usage_report(
  input_from_date date,
  input_to_date date
)
returns table (
  promotion_code text,
  usage_count bigint,
  discount_total numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('reports:read');

  select
    coalesce(promotion_snapshot_item ->> 'code', promotion_snapshot_item ->> 'name', 'unknown') as promotion_code,
    count(*)::bigint as usage_count,
    coalesce(sum((promotion_snapshot_item ->> 'discountTotal')::numeric), 0) as discount_total
  from order_items
  join orders on orders.id = order_items.order_id
  cross join lateral jsonb_array_elements(order_items.promotion_snapshot) as promotion_snapshot_item
  where orders.placed_at >= input_from_date
    and orders.placed_at < input_to_date + interval '1 day'
    and orders.order_status not in ('cancelled', 'payment_failed')
  group by promotion_code
  order by discount_total desc;
$$;

create or replace function get_low_stock_report(
  input_threshold numeric default 5
)
returns table (
  variant_id uuid,
  sku text,
  product_name text,
  warehouse_id uuid,
  warehouse_code text,
  available_quantity numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('reports:read');

  select
    product_variants.id as variant_id,
    product_variants.sku,
    products.name as product_name,
    warehouses.id as warehouse_id,
    warehouses.code as warehouse_code,
    calculate_available_stock(product_variants.id, warehouses.id) as available_quantity
  from product_variants
  join products on products.id = product_variants.product_id
  cross join warehouses
  where product_variants.is_active = true
    and warehouses.is_active = true
    and calculate_available_stock(product_variants.id, warehouses.id) <= input_threshold
  order by available_quantity asc, product_variants.sku asc;
$$;

create or replace function get_expiring_stock_report(
  input_days integer default 7
)
returns table (
  lot_id uuid,
  variant_id uuid,
  sku text,
  warehouse_id uuid,
  warehouse_code text,
  lot_no text,
  expiry_at timestamptz,
  on_hand_quantity numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('reports:read');

  select
    lots.id as lot_id,
    lots.variant_id,
    product_variants.sku,
    lots.warehouse_id,
    warehouses.code as warehouse_code,
    lots.lot_no,
    lots.expiry_at,
    coalesce(sum(stock_ledger_entries.quantity_delta), 0) as on_hand_quantity
  from lots
  join product_variants on product_variants.id = lots.variant_id
  join warehouses on warehouses.id = lots.warehouse_id
  left join stock_ledger_entries on stock_ledger_entries.lot_id = lots.id
  where lots.quality_status = 'sellable'
    and lots.expiry_at is not null
    and lots.expiry_at >= now()
    and lots.expiry_at < now() + make_interval(days => input_days)
  group by lots.id, product_variants.sku, warehouses.code
  having coalesce(sum(stock_ledger_entries.quantity_delta), 0) > 0
  order by lots.expiry_at asc;
$$;

create or replace function get_stock_adjustments_report(
  input_from_date date,
  input_to_date date
)
returns table (
  entry_id uuid,
  variant_id uuid,
  sku text,
  warehouse_id uuid,
  warehouse_code text,
  movement_type text,
  quantity_delta numeric,
  source_doc_type text,
  source_doc_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('reports:read');

  select
    stock_ledger_entries.id as entry_id,
    stock_ledger_entries.variant_id,
    product_variants.sku,
    stock_ledger_entries.warehouse_id,
    warehouses.code as warehouse_code,
    stock_ledger_entries.movement_type,
    stock_ledger_entries.quantity_delta,
    stock_ledger_entries.source_doc_type,
    stock_ledger_entries.source_doc_id,
    stock_ledger_entries.created_at
  from stock_ledger_entries
  join product_variants on product_variants.id = stock_ledger_entries.variant_id
  join warehouses on warehouses.id = stock_ledger_entries.warehouse_id
  where stock_ledger_entries.created_at >= input_from_date
    and stock_ledger_entries.created_at < input_to_date + interval '1 day'
  order by stock_ledger_entries.created_at desc;
$$;

create or replace function get_purchase_orders_report(
  input_from_date date,
  input_to_date date
)
returns table (
  purchase_order_id uuid,
  po_no text,
  supplier_name text,
  warehouse_code text,
  status purchase_order_status,
  ordered_total numeric,
  received_total numeric,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('reports:read');

  select
    purchase_orders.id as purchase_order_id,
    purchase_orders.po_no,
    suppliers.name as supplier_name,
    warehouses.code as warehouse_code,
    purchase_orders.status,
    purchase_orders.ordered_total,
    purchase_orders.received_total,
    purchase_orders.created_at
  from purchase_orders
  join suppliers on suppliers.id = purchase_orders.supplier_id
  join warehouses on warehouses.id = purchase_orders.destination_warehouse_id
  where purchase_orders.created_at >= input_from_date
    and purchase_orders.created_at < input_to_date + interval '1 day'
  order by purchase_orders.created_at desc;
$$;

create or replace function get_refunds_report(
  input_from_date date,
  input_to_date date
)
returns table (
  refund_id uuid,
  order_id uuid,
  order_no text,
  amount numeric,
  refund_method text,
  status refund_status,
  reason text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('reports:read');

  select
    refunds.id as refund_id,
    refunds.order_id,
    orders.order_no,
    refunds.amount,
    refunds.refund_method,
    refunds.status,
    refunds.reason,
    refunds.created_at
  from refunds
  join orders on orders.id = refunds.order_id
  where refunds.created_at >= input_from_date
    and refunds.created_at < input_to_date + interval '1 day'
  order by refunds.created_at desc;
$$;
