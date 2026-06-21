-- Create public media bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Public read
create policy "media_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Admin insert
create policy "media_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_admin_roles
      where user_id = (select auth.uid())
    )
  );

-- Admin update (needed for upsert)
create policy "media_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_admin_roles
      where user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_admin_roles
      where user_id = (select auth.uid())
    )
  );

-- Admin delete
create policy "media_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_admin_roles
      where user_id = (select auth.uid())
    )
  );
