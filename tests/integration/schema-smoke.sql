select
  to_regclass('public.products') as products_table,
  to_regclass('public.orders') as orders_table,
  to_regclass('public.stock_ledger_entries') as stock_ledger_table,
  to_regclass('public.stock_reservations') as reservations_table;
