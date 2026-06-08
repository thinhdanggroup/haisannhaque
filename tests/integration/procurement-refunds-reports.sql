begin;

grant usage on schema public to authenticated;
grant select, insert, update, delete
on admin_roles,
   user_admin_roles,
   orders,
   order_items,
   suppliers,
   purchase_orders,
   purchase_order_lines,
   goods_receipts,
   goods_receipt_lines,
   refunds,
   complaint_cases
to authenticated;

do $$
declare
  actor_id uuid := '018f0000-0000-4000-8000-000000000099';
  catalog_actor_id uuid := '018f0000-0000-4000-8000-000000000098';
  reporter_actor_id uuid := '018f0000-0000-4000-8000-000000000097';
  super_admin_role_id uuid;
  catalog_manager_role_id uuid;
  reporter_role_id uuid;
  finance_role_id uuid;
  supplier_id uuid;
  warehouse_id uuid;
  product_id uuid;
  variant_id uuid;
  purchase_order_record purchase_orders%rowtype;
  purchase_order_line_id uuid;
  receipt_record goods_receipts%rowtype;
  order_id uuid;
  payment_id uuid;
  complaint_id uuid;
  denied_update_count integer;
  reporter_purchase_order_report_count integer;
  reporter_refund_report_count integer;
  daily_report_record record;
begin
  begin
    perform create_purchase_order('{}'::jsonb, null);
    raise exception 'Expected purchase order RPC to require admin privileges';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform create_refund('{}'::jsonb, null);
    raise exception 'Expected refund RPC to require admin privileges';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform create_complaint_case(jsonb_build_object('reason', 'Unauthenticated complaint'), null);
    raise exception 'Expected complaint RPC to require admin privileges';
  exception
    when insufficient_privilege then
      null;
  end;

  insert into auth.users (id)
  values (actor_id)
  on conflict (id) do nothing;

  insert into auth.users (id)
  values (catalog_actor_id)
  on conflict (id) do nothing;

  insert into auth.users (id)
  values (reporter_actor_id)
  on conflict (id) do nothing;

  select id
  into super_admin_role_id
  from admin_roles
  where name = 'super_admin';

  select id
  into catalog_manager_role_id
  from admin_roles
  where name = 'catalog_manager';

  select id
  into reporter_role_id
  from admin_roles
  where name = 'reporter';

  select id
  into finance_role_id
  from admin_roles
  where name = 'finance';

  insert into user_admin_roles (user_id, role_id)
  values (actor_id, super_admin_role_id)
  on conflict (user_id, role_id) do nothing;

  insert into user_admin_roles (user_id, role_id)
  values (catalog_actor_id, catalog_manager_role_id)
  on conflict (user_id, role_id) do nothing;

  insert into user_admin_roles (user_id, role_id)
  values (reporter_actor_id, reporter_role_id)
  on conflict (user_id, role_id) do nothing;

  perform set_config('request.jwt.claim.sub', catalog_actor_id::text, true);

  begin
    perform create_purchase_order('{}'::jsonb, catalog_actor_id);
    raise exception 'Expected catalog manager to be denied purchase order RPC access';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform create_refund('{}'::jsonb, catalog_actor_id);
    raise exception 'Expected catalog manager to be denied refund RPC access';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform create_complaint_case(jsonb_build_object('reason', 'Catalog manager complaint'), catalog_actor_id);
    raise exception 'Expected catalog manager to be denied complaint RPC access';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform 1 from get_daily_sales_report(current_date, current_date);
    raise exception 'Expected catalog manager to be denied report RPC access';
  exception
    when insufficient_privilege then
      null;
  end;

  perform set_config('request.jwt.claim.sub', actor_id::text, true);

  select id
  into warehouse_id
  from warehouses
  where code = 'HCM-01'
  limit 1;

  insert into suppliers (name, phone, email)
  values ('Nha cung cap hai san test', '0900000000', 'supplier@example.test')
  returning id into supplier_id;

  insert into products (
    slug,
    name,
    short_description,
    origin,
    temperature_class,
    status
  )
  values (
    'tom-hum-test',
    'Tom hum test',
    'Hai san test',
    'Khanh Hoa',
    'frozen',
    'published'
  )
  returning id into product_id;

  insert into product_variants (
    product_id,
    sku,
    unit,
    list_price,
    sale_price,
    is_active
  )
  values (
    product_id,
    'TOM-HUM-TEST',
    'kg',
    150000,
    null,
    true
  )
  returning id into variant_id;

  select *
  into purchase_order_record
  from create_purchase_order(
    jsonb_build_object(
      'supplierId', supplier_id,
      'destinationWarehouseId', warehouse_id,
      'expectedAt', null,
      'lines', jsonb_build_array(
        jsonb_build_object(
          'variantId', variant_id,
          'orderedQty', 2,
          'unitCost', 90000
        )
      )
    ),
    null
  );

  if purchase_order_record.status <> 'submitted' or purchase_order_record.ordered_total <> 180000 then
    raise exception 'Expected submitted purchase order with ordered total';
  end if;

  select id
  into purchase_order_line_id
  from purchase_order_lines
  where purchase_order_id = purchase_order_record.id;

  select *
  into receipt_record
  from receive_purchase_order(
    purchase_order_record.id,
    jsonb_build_object(
      'notes', 'Integration receipt',
      'lines', jsonb_build_array(
        jsonb_build_object(
          'purchaseOrderLineId', purchase_order_line_id,
          'receivedQty', 2,
          'lotNo', 'PO-LOT-TEST',
          'expiryAt', (now() + interval '5 days')::text
        )
      )
    ),
    null
  );

  if not exists (
    select 1
    from purchase_orders
    where id = purchase_order_record.id
      and status = 'received'
      and received_total = 180000
  ) then
    raise exception 'Expected purchase order to be fully received';
  end if;

  if not exists (
    select 1
    from stock_ledger_entries
    where source_doc_type = 'goods_receipts'
      and source_doc_id = receipt_record.id
      and quantity_delta = 2
  ) then
    raise exception 'Expected purchase receipt stock ledger entry';
  end if;

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
    idempotency_key,
    placed_at
  )
  values (
    'DHS-REPORT-TEST',
    'web',
    'completed',
    'paid',
    'delivered',
    300000,
    0,
    0,
    300000,
    'report-test',
    now()
  )
  returning id into order_id;

  insert into order_items (
    order_id,
    variant_id,
    product_name_snapshot,
    sku_snapshot,
    quantity,
    unit_price
  )
  values (
    order_id,
    variant_id,
    'Tom hum test',
    'TOM-HUM-TEST',
    2,
    150000
  );

  insert into payments (
    order_id,
    provider,
    provider_ref,
    payment_method,
    status,
    amount
  )
  values (
    order_id,
    'momo',
    'refund-test',
    'momo',
    'paid',
    300000
  )
  returning id into payment_id;

  perform set_config('request.jwt.claim.sub', catalog_actor_id::text, true);
  execute 'set local role authenticated';

  begin
    update orders
    set order_status = 'cancelled'
    where id = order_id;
    get diagnostics denied_update_count = row_count;

    if denied_update_count > 0 then
      raise exception 'Expected catalog manager direct order update to be denied';
    end if;
  end;

  begin
    insert into user_admin_roles (user_id, role_id)
    values (catalog_actor_id, finance_role_id);
    raise exception 'Expected catalog manager direct role assignment to be denied';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into suppliers (name)
    values ('Catalog manager direct supplier');
    raise exception 'Expected catalog manager direct supplier insert to be denied';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into purchase_orders (
      po_no,
      supplier_id,
      destination_warehouse_id,
      status,
      ordered_total
    )
    values (
      'PO-CATALOG-BYPASS',
      supplier_id,
      warehouse_id,
      'submitted',
      1
    );
    raise exception 'Expected catalog manager direct purchase order insert to be denied';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into purchase_order_lines (
      purchase_order_id,
      variant_id,
      ordered_qty,
      unit_cost
    )
    values (
      purchase_order_record.id,
      variant_id,
      1,
      1
    );
    raise exception 'Expected catalog manager direct purchase order line insert to be denied';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into goods_receipts (
      purchase_order_id,
      warehouse_id
    )
    values (
      purchase_order_record.id,
      warehouse_id
    );
    raise exception 'Expected catalog manager direct goods receipt insert to be denied';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into goods_receipt_lines (
      goods_receipt_id,
      purchase_order_line_id,
      variant_id,
      received_qty,
      unit_cost
    )
    values (
      receipt_record.id,
      purchase_order_line_id,
      variant_id,
      1,
      1
    );
    raise exception 'Expected catalog manager direct goods receipt line insert to be denied';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into refunds (
      order_id,
      payment_id,
      amount,
      refund_method,
      reason
    )
    values (
      order_id,
      payment_id,
      1,
      'manual_finance',
      'Catalog manager bypass'
    );
    raise exception 'Expected catalog manager direct refund insert to be denied';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into complaint_cases (
      order_id,
      reason
    )
    values (
      order_id,
      'Catalog manager bypass'
    );
    raise exception 'Expected catalog manager direct complaint insert to be denied';
  exception
    when insufficient_privilege then
      null;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', actor_id::text, true);

  perform create_refund(
    jsonb_build_object(
      'orderId', order_id,
      'paymentId', payment_id,
      'amount', 120000,
      'refundMethod', 'gateway',
      'reason', 'Damaged item'
    ),
    null
  );

  if not exists (
    select 1
    from orders
    where id = order_id
      and payment_status = 'partially_refunded'
  ) then
    raise exception 'Expected order payment status to become partially refunded';
  end if;

  perform set_config('request.jwt.claim.sub', reporter_actor_id::text, true);
  execute 'set local role authenticated';

  select count(*)
  into reporter_purchase_order_report_count
  from get_purchase_orders_report(current_date, current_date);

  select count(*)
  into reporter_refund_report_count
  from get_refunds_report(current_date, current_date);

  if reporter_purchase_order_report_count < 1 or reporter_refund_report_count < 1 then
    raise exception 'Expected reporter to see purchase order and refund report rows';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', actor_id::text, true);

  select id
  into complaint_id
  from create_complaint_case(
    jsonb_build_object(
      'orderId', order_id,
      'reason', 'Damaged item after delivery',
      'resolution', 'Finance refund created'
    ),
    actor_id
  );

  if not exists (
    select 1
    from audit_logs
    where entity_type = 'complaint_cases'
      and entity_id = complaint_id
      and action = 'complaint_case_created'
  ) then
    raise exception 'Expected complaint creation audit log';
  end if;

  begin
    perform create_refund(
      jsonb_build_object(
        'orderId', order_id,
        'amount', 200001,
        'refundMethod', 'manual_finance',
        'reason', 'Exceeds total'
      ),
      null
    );
    raise exception 'Expected excessive refund to fail';
  exception
    when others then
      if sqlerrm = 'Expected excessive refund to fail' then
        raise;
      end if;
  end;

  select *
  into daily_report_record
  from get_daily_sales_report(current_date, current_date)
  where report_date = current_date;

  if daily_report_record.order_count < 1
    or daily_report_record.revenue_total < 300000
    or daily_report_record.refund_total < 120000 then
    raise exception 'Expected daily sales report to include order and refund totals';
  end if;

  perform 1 from get_product_sales_report(current_date, current_date);
  perform 1 from get_promotion_usage_report(current_date, current_date);
  perform 1 from get_low_stock_report(10);
  perform 1 from get_expiring_stock_report(10);
  perform 1 from get_stock_adjustments_report(current_date, current_date);
  perform 1 from get_purchase_orders_report(current_date, current_date);
  perform 1 from get_refunds_report(current_date, current_date);
end $$;

rollback;
