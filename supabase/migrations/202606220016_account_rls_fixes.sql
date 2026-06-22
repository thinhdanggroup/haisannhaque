-- Allow users to insert their own profile row (needed for upsert on first save)
create policy "users can insert own profile"
  on profiles
  for insert
  with check (id = auth.uid());

-- Allow customers to delete their own wishlist items
create policy "customers can delete own wishlist items"
  on wishlist_items
  for delete
  using (
    exists (
      select 1
      from wishlists
      join customers on customers.id = wishlists.customer_id
      where wishlists.id = wishlist_items.wishlist_id
        and customers.user_id = auth.uid()
    )
  );
