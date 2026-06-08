create or replace function get_admin_refund_rows(
  input_limit integer default 50
)
returns table (
  order_no text,
  amount numeric,
  refund_method text,
  status refund_status,
  reason text
)
language sql
stable
security definer
set search_path = public
as $$
  select assert_admin_permission_rpc('payments:read');

  select
    orders.order_no,
    refunds.amount,
    refunds.refund_method,
    refunds.status,
    refunds.reason
  from refunds
  join orders on orders.id = refunds.order_id
  order by refunds.created_at desc
  limit least(greatest(coalesce(input_limit, 50), 0), 200);
$$;
